import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import type { User } from "../../src/lib/types";
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    "TEST_DATABASE_URL must point to a test PostgreSQL database.",
  );
const adminPool = new Pool({ connectionString: url });
const schema = `test_${randomUUID().replaceAll("-", "")}`;
let db: typeof import("../../src/lib/db");
let service: typeof import("../../src/lib/reservations");
let member: User, other: User, admin: User, resourceId: string;
const starts = new Date(Date.now() + 86400000).toISOString();
const ends = new Date(Date.now() + 90000000).toISOString();
const input = () => ({
  resource_id: resourceId,
  title: "Planning",
  notes: "",
  starts_at: starts,
  ends_at: ends,
  attendees: 4,
});
beforeAll(async () => {
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  const connection = new URL(url!);
  connection.searchParams.set("options", `-csearch_path=${schema},public`);
  process.env.DATABASE_URL = connection.toString();
  db = await import("../../src/lib/db");
  service = await import("../../src/lib/reservations");
  await db.pool.query(await readFile("db/migrations/001_initial.sql", "utf8"));
  const users = await db.pool
    .query(`INSERT INTO users(name,email,password_hash,role) VALUES
    ('Sam','sam@example.com','unused','member'),('Jo','jo@example.com','unused','member'),('Alex','alex@example.com','unused','admin') RETURNING id,name,email,role`);
  [member, other, admin] = users.rows;
});
beforeEach(async () => {
  await db.pool.query("TRUNCATE reservations,resources CASCADE");
  resourceId = (
    await db.pool.query(
      "INSERT INTO resources(name,category,location,capacity) VALUES ('Room','Meeting room','Level 1',8) RETURNING id",
    )
  ).rows[0].id;
});
afterAll(async () => {
  if (db) await db.pool.end();
  await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await adminPool.end();
});
describe("PostgreSQL reservation invariants", () => {
  it("allows exactly one simultaneous overlapping reservation", async () => {
    const results = await Promise.allSettled([
      service.saveReservation(member, input()),
      service.saveReservation(other, input()),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult;
    expect(failed.reason.code).toBe("23P01");
    expect((await db.pool.query("SELECT * FROM reservations")).rowCount).toBe(
      1,
    );
  });
  it("permits adjacent bookings and overlap on a different resource", async () => {
    await service.saveReservation(member, input());
    await expect(
      service.saveReservation(other, {
        ...input(),
        starts_at: ends,
        ends_at: new Date(new Date(ends).getTime() + 3600000).toISOString(),
      }),
    ).resolves.toBeTruthy();
    const second = (
      await db.pool.query(
        "INSERT INTO resources(name,category,location,capacity) VALUES ('Other','Meeting room','Level 2',8) RETURNING id",
      )
    ).rows[0].id;
    await expect(
      service.saveReservation(other, { ...input(), resource_id: second }),
    ).resolves.toBeTruthy();
  });
  it("cancellation preserves history and frees the slot", async () => {
    const booking = await service.saveReservation(member, input());
    await service.cancelReservation(member, booking.id);
    await service.cancelReservation(member, booking.id);
    expect(
      (
        await db.pool.query(
          "SELECT cancelled_by FROM reservations WHERE id=$1",
          [booking.id],
        )
      ).rows[0].cancelled_by,
    ).toBe(member.id);
    await expect(service.saveReservation(other, input())).resolves.toBeTruthy();
  });
  it("rejects cross-user edits and cancellations but permits administrators", async () => {
    const booking = await service.saveReservation(member, input());
    await expect(
      service.saveReservation(
        other,
        { ...input(), title: "Changed" },
        booking.id,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.cancelReservation(other, booking.id),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.saveReservation(
        admin,
        { ...input(), title: "Changed" },
        booking.id,
      ),
    ).resolves.toMatchObject({ title: "Changed", user_id: member.id });
    await expect(
      service.cancelReservation(admin, booking.id),
    ).resolves.toBeUndefined();
  });
  it("rolls back conflicting edits and retains the original slot", async () => {
    const first = await service.saveReservation(member, input());
    const nextStart = new Date(
      new Date(ends).getTime() + 3600000,
    ).toISOString();
    const nextEnd = new Date(new Date(ends).getTime() + 7200000).toISOString();
    await service.saveReservation(other, {
      ...input(),
      starts_at: nextStart,
      ends_at: nextEnd,
    });
    await expect(
      service.saveReservation(
        member,
        { ...input(), starts_at: nextStart, ends_at: nextEnd },
        first.id,
      ),
    ).rejects.toMatchObject({ code: "23P01" });
    expect(
      (
        await db.pool.query("SELECT starts_at FROM reservations WHERE id=$1", [
          first.id,
        ])
      ).rows[0].starts_at.toISOString(),
    ).toBe(starts);
  });
  it("rejects capacity violations, past starts, and archived resources", async () => {
    await expect(
      service.saveReservation(member, { ...input(), attendees: 9 }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.saveReservation(member, {
        ...input(),
        starts_at: new Date(Date.now() - 60000).toISOString(),
      }),
    ).rejects.toMatchObject({ status: 400 });
    await db.pool.query("UPDATE resources SET archived_at=now() WHERE id=$1", [
      resourceId,
    ]);
    await expect(
      service.saveReservation(member, input()),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("database rejects invalid ranges even when application validation is bypassed", async () => {
    await expect(
      db.pool.query(
        "INSERT INTO reservations(resource_id,user_id,title,starts_at,ends_at,attendees) VALUES ($1,$2,$3,$4,$4,1)",
        [resourceId, member.id, "Invalid", starts],
      ),
    ).rejects.toBeTruthy();
  });
  it("completed and cancelled reservations cannot be edited", async () => {
    const booking = await service.saveReservation(member, input());
    await service.cancelReservation(member, booking.id);
    await expect(
      service.saveReservation(member, input(), booking.id),
    ).rejects.toMatchObject({ status: 409 });
    await db.pool.query(
      "UPDATE reservations SET cancelled_at=NULL,cancelled_by=NULL,starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' WHERE id=$1",
      [booking.id],
    );
    await expect(
      service.saveReservation(member, input(), booking.id),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.cancelReservation(member, booking.id),
    ).rejects.toMatchObject({ status: 409 });
  });
});
