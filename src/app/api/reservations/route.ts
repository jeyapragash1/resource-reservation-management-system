import { NextResponse } from "next/server";
import { requireUser } from "@/backend/lib/auth";
import { pool } from "@/backend/lib/db";
import { reservationSchema, idSchema } from "@/backend/lib/validation";
import { saveReservation } from "@/backend/lib/reservations";
import {
  body,
  checkOrigin,
  errorResponse,
  HttpError,
} from "@/backend/lib/http";
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
    const month = params.get("month");
    if (month && !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month))
      throw new HttpError(400, "Invalid calendar month.");
    const monthStart = month ? `${month}-01T00:00:00+05:30` : null;
    const nextMonth = month
      ? new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 1))
          .toISOString()
          .slice(0, 7)
      : null;
    const monthEnd = nextMonth ? `${nextMonth}-01T00:00:00+05:30` : null;
    if (!Number.isInteger(page) || page < 1 || page > 100000)
      throw new HttpError(400, "Invalid page.");
    const result = await pool.query(
      `WITH filtered AS (
      SELECT b.*,r.name AS resource_name,r.category AS resource_category,r.location,u.name AS organizer_name
      FROM reservations b JOIN resources r ON r.id=b.resource_id JOIN users u ON u.id=b.user_id
      WHERE ($1::boolean = false OR b.user_id=$2) AND ($3::uuid IS NULL OR b.resource_id=$3)
      AND ($6::timestamptz IS NULL OR (b.starts_at < $7::timestamptz AND b.ends_at > $6::timestamptz))
      AND ($4='all' OR ($4='upcoming' AND b.cancelled_at IS NULL AND b.ends_at > now())
        OR ($4='past' AND b.cancelled_at IS NULL AND b.ends_at <= now()) OR ($4='cancelled' AND b.cancelled_at IS NOT NULL))
      ), paged AS (
        SELECT * FROM filtered ORDER BY CASE WHEN $4='upcoming' THEN starts_at END ASC,starts_at DESC,id LIMIT 20 OFFSET $5
      ) SELECT COALESCE((SELECT json_agg(p) FROM paged p),'[]'::json) AS items,
        (SELECT count(*)::int FROM filtered) AS total`,
      [
        scope === "mine",
        user.id,
        resource,
        status,
        (page - 1) * 20,
        monthStart,
        monthEnd,
      ],
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
