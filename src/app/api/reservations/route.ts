import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { reservationSchema, idSchema } from "@/lib/validation";
import { saveReservation } from "@/lib/reservations";
import { body, checkOrigin, errorResponse, HttpError } from "@/lib/http";
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const scope = params.get("scope") ?? "all";
    const status = params.get("status") ?? "upcoming";
    if (
      !["all", "mine"].includes(scope) ||
      !["all", "upcoming", "past", "cancelled"].includes(status)
    )
      throw new HttpError(400, "Invalid reservation filter.");
    const resource = params.get("resource");
    if (resource) idSchema.parse(resource);
    const page = Number(params.get("page") ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000)
      throw new HttpError(400, "Invalid page.");
    const result = await pool.query(
      `WITH filtered AS (
      SELECT b.*,r.name AS resource_name,r.category AS resource_category,r.location,u.name AS organizer_name
      FROM reservations b JOIN resources r ON r.id=b.resource_id JOIN users u ON u.id=b.user_id
      WHERE ($1::boolean = false OR b.user_id=$2) AND ($3::uuid IS NULL OR b.resource_id=$3)
      AND ($4='all' OR ($4='upcoming' AND b.cancelled_at IS NULL AND b.ends_at > now())
        OR ($4='past' AND b.cancelled_at IS NULL AND b.ends_at <= now()) OR ($4='cancelled' AND b.cancelled_at IS NOT NULL))
      ), paged AS (
        SELECT * FROM filtered ORDER BY CASE WHEN $4='upcoming' THEN starts_at END ASC,starts_at DESC,id LIMIT 20 OFFSET $5
      ) SELECT COALESCE((SELECT json_agg(p) FROM paged p),'[]'::json) AS items,
        (SELECT count(*)::int FROM filtered) AS total`,
      [scope === "mine", user.id, resource, status, (page - 1) * 20],
    );
    return NextResponse.json({ ...result.rows[0], page });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    return NextResponse.json(
      await saveReservation(user, reservationSchema.parse(await body(request))),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
