import { pool, transaction } from "./db";
import { HttpError } from "./http";
import { reservationSchema } from "./validation";
import type { User } from "./types";
import type { z } from "zod";
type Input = z.infer<typeof reservationSchema>;
export async function saveReservation(user: User, input: Input, id?: string) {
  return transaction(async (client) => {
    // Resource locks serialize booking with resource edits and archiving.
    const resource = (
      await client.query("SELECT * FROM resources WHERE id = $1 FOR UPDATE", [
        input.resource_id,
      ])
    ).rows[0];
    if (!resource || resource.archived_at)
      throw new HttpError(
        409,
        "This resource is no longer available for reservations.",
      );
    if (input.attendees > resource.capacity)
      throw new HttpError(
        400,
        `This resource has capacity for ${resource.capacity}.`,
      );
    const now = (await client.query("SELECT clock_timestamp() AS time")).rows[0]
      .time as Date;
    if (new Date(input.starts_at) <= now)
      throw new HttpError(400, "Start time must be in the future.");
    const values = [
      input.resource_id,
      input.title,
      input.notes,
      input.starts_at,
      input.ends_at,
      input.attendees,
    ];
    if (id) {
      const existing = (
        await client.query(
          "SELECT * FROM reservations WHERE id = $1 FOR UPDATE",
          [id],
        )
      ).rows[0];
      if (!existing) throw new HttpError(404, "Reservation not found.");
      if (existing.user_id !== user.id && user.role !== "admin")
        throw new HttpError(403, "You can only change your own reservations.");
      if (existing.cancelled_at || existing.starts_at <= now)
        throw new HttpError(
          409,
          "Only upcoming active reservations can be changed.",
        );
      return (
        await client.query(
          `UPDATE reservations SET resource_id=$1,title=$2,notes=$3,starts_at=$4,ends_at=$5,attendees=$6,updated_at=now()
        WHERE id=$7 RETURNING *`,
          [...values, id],
        )
      ).rows[0];
    }
    return (
      await client.query(
        `INSERT INTO reservations(resource_id,title,notes,starts_at,ends_at,attendees,user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [...values, user.id],
      )
    ).rows[0];
  });
}
export async function cancelReservation(user: User, id: string) {
  const result = await pool.query(
    `UPDATE reservations SET cancelled_at=now(),cancelled_by=$2,updated_at=now()
    WHERE id=$1 AND (user_id=$2 OR $3) AND cancelled_at IS NULL AND ends_at > clock_timestamp() RETURNING id`,
    [id, user.id, user.role === "admin"],
  );
  if (!result.rowCount) {
    const row = (
      await pool.query("SELECT * FROM reservations WHERE id=$1", [id])
    ).rows[0];
    if (!row) throw new HttpError(404, "Reservation not found.");
    if (row.user_id !== user.id && user.role !== "admin")
      throw new HttpError(403, "You can only cancel your own reservations.");
    if (row.cancelled_at) return;
    throw new HttpError(409, "Completed reservations cannot be cancelled.");
  }
}
