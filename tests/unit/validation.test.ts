import { describe, expect, it } from "vitest";
import {
  reservationSchema,
  resourceSchema,
  requireFuture,
  availabilitySchema,
} from "../../src/backend/lib/validation";
import {
  fromLocalInput,
  toLocalInput,
  formatDate,
} from "../../src/shared/time";
const booking = {
  resource_id: "06782eca-15e2-4c71-93c0-7446a57376b9",
  title: "Team planning",
  starts_at: "2026-10-20T09:00:00+05:30",
  ends_at: "2026-10-20T10:00:00+05:30",
  attendees: 3,
};
describe("booking validation", () => {
  it("accepts explicit time zones and trims input", () =>
    expect(
      reservationSchema.parse({ ...booking, title: " Planning " }).title,
    ).toBe("Planning"));
  it.each([
    { ends_at: booking.starts_at },
    { ends_at: "2026-10-19T10:00:00Z" },
    { ends_at: "2026-10-28T10:00:00Z" },
    { starts_at: "2026-10-20T09:00" },
    { attendees: 0 },
    { attendees: 1.5 },
    { title: "  " },
    { resource_id: "x" },
  ])("rejects invalid booking values %j", (value) =>
    expect(reservationSchema.safeParse({ ...booking, ...value }).success).toBe(
      false,
    ),
  );
  it("accepts exactly seven days", () =>
    expect(
      reservationSchema.safeParse({
        ...booking,
        starts_at: "2026-10-20T00:00:00Z",
        ends_at: "2026-10-27T00:00:00Z",
      }).success,
    ).toBe(true));
  it("rejects past or present start time", () =>
    expect(() =>
      requireFuture("2026-10-20T00:00:00Z", Date.parse("2026-10-20T00:00:00Z")),
    ).toThrow("future"));
  it("validates availability intervals", () =>
    expect(
      availabilitySchema.safeParse({
        start: booking.ends_at,
        end: booking.starts_at,
      }).success,
    ).toBe(false));
});
describe("resource validation", () => {
  const resource = {
    name: "Cedar",
    category: "Meeting room",
    location: "Level 1",
    capacity: 8,
  };
  it("accepts a practical resource", () =>
    expect(resourceSchema.parse(resource).description).toBe(""));
  it.each([
    { capacity: 0 },
    { capacity: 1001 },
    { category: "Unknown" },
    { name: " " },
  ])("rejects invalid resource %j", (v) =>
    expect(resourceSchema.safeParse({ ...resource, ...v }).success).toBe(false),
  );
});
describe("Sri Lanka time", () => {
  it("converts inputs without depending on the browser time zone", () => {
    expect(fromLocalInput("2026-10-20T09:00")).toBe("2026-10-20T03:30:00.000Z");
    expect(toLocalInput("2026-10-20T03:30:00Z")).toBe("2026-10-20T09:00");
  });
  it("uses the Sri Lanka date across UTC midnight", () =>
    expect(formatDate("2026-10-19T20:00:00Z")).toBe("20 Oct 2026"));
});
