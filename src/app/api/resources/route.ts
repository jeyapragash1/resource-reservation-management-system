import { NextResponse } from "next/server";
import { requireUser } from "@/backend/lib/auth";
import { pool } from "@/backend/lib/db";
import { availabilitySchema, resourceSchema } from "@/backend/lib/validation";
import { body, checkOrigin, errorResponse } from "@/backend/lib/http";
export async function GET(request: Request) {
  try {
    await requireUser();
    const params = new URL(request.url).searchParams;
    const archived = params.get("archived") === "true";
    const start = params.get("start"),
      end = params.get("end");
    if (start || end) availabilitySchema.parse({ start, end });
    const result = await pool.query(
      `SELECT r.*,
      NOT EXISTS (SELECT 1 FROM reservations b WHERE b.resource_id=r.id AND b.cancelled_at IS NULL
        AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(COALESCE($1::timestamptz,now()),COALESCE($2::timestamptz,now()+interval '1 second'),'[)')) AS available,
      (SELECT count(*)::int FROM reservations b WHERE b.resource_id=r.id AND b.cancelled_at IS NULL AND b.ends_at > now()) AS upcoming_count
      FROM resources r WHERE ($3::boolean OR r.archived_at IS NULL) ORDER BY r.archived_at NULLS FIRST,r.name`,
      [start, end, archived],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireUser(true);
    const v = resourceSchema.parse(await body(request));
    const result = await pool.query(
      "INSERT INTO resources(name,category,location,capacity,description) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [v.name, v.category, v.location, v.capacity, v.description],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
