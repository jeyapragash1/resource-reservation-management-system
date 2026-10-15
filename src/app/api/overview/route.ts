import { NextResponse } from "next/server";
import { requireUser } from "@/backend/lib/auth";
import { pool } from "@/backend/lib/db";
import { errorResponse } from "@/backend/lib/http";
export async function GET() {
  try {
    const user = await requireUser();
    const result = await pool.query(
      `SELECT
      (SELECT count(*)::int FROM resources WHERE archived_at IS NULL) AS resources,
      (SELECT count(DISTINCT resource_id)::int FROM reservations WHERE cancelled_at IS NULL AND starts_at <= now() AND ends_at > now()) AS in_use,
      (SELECT count(*)::int FROM reservations WHERE cancelled_at IS NULL AND user_id=$1 AND ends_at > now()) AS mine,
      (SELECT count(*)::int FROM reservations WHERE cancelled_at IS NULL AND tstzrange(starts_at,ends_at,'[)') &&
        tstzrange(date_trunc('day',now() AT TIME ZONE 'Asia/Colombo') AT TIME ZONE 'Asia/Colombo',
        (date_trunc('day',now() AT TIME ZONE 'Asia/Colombo')+interval '1 day') AT TIME ZONE 'Asia/Colombo','[)')) AS today`,
      [user.id],
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return errorResponse(error);
  }
}
