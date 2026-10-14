import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { idSchema, resourceSchema } from "@/lib/validation";
import { body, checkOrigin, errorResponse, HttpError } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    await requireUser(true);
    const id = idSchema.parse((await context.params).id);
    const v = resourceSchema.parse(await body(request));
    const result = await transaction(async (client) => {
      const existing = (
        await client.query("SELECT * FROM resources WHERE id=$1 FOR UPDATE", [
          id,
        ])
      ).rows[0];
      if (!existing) throw new HttpError(404, "Resource not found.");
      if (existing.archived_at)
        throw new HttpError(409, "Archived resources cannot be edited.");
      const bookings = await client.query(
        "SELECT 1 FROM reservations WHERE resource_id=$1 AND cancelled_at IS NULL AND ends_at > now() AND attendees > $2 LIMIT 1",
        [id, v.capacity],
      );
      if (bookings.rowCount)
        throw new HttpError(
          409,
          "Capacity cannot be reduced below the attendee count of an active reservation.",
        );
      return (
        await client.query(
          "UPDATE resources SET name=$2,category=$3,location=$4,capacity=$5,description=$6,updated_at=now() WHERE id=$1 RETURNING *",
          [id, v.name, v.category, v.location, v.capacity, v.description],
        )
      ).rows[0];
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    await requireUser(true);
    const id = idSchema.parse((await context.params).id);
    await transaction(async (client) => {
      const row = (
        await client.query("SELECT * FROM resources WHERE id=$1 FOR UPDATE", [
          id,
        ])
      ).rows[0];
      if (!row) throw new HttpError(404, "Resource not found.");
      if (row.archived_at) return;
      const bookings = await client.query(
        "SELECT 1 FROM reservations WHERE resource_id=$1 AND cancelled_at IS NULL AND ends_at > now() LIMIT 1",
        [id],
      );
      if (bookings.rowCount)
        throw new HttpError(
          409,
          "Cancel active and upcoming reservations before archiving this resource.",
        );
      await client.query(
        "UPDATE resources SET archived_at=now(),updated_at=now() WHERE id=$1",
        [id],
      );
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
