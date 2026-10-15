import { NextResponse } from "next/server";
import { pool } from "@/backend/lib/db";
import { loginSchema } from "@/backend/lib/validation";
import { hashPassword, verifyPassword } from "@/backend/lib/password";
import { createSession } from "@/backend/lib/auth";
import {
  body,
  checkOrigin,
  errorResponse,
  HttpError,
} from "@/backend/lib/http";
const dummyHash = hashPassword("invalid-account-password");
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { email, password } = loginSchema.parse(await body(request));
    const attempt = await pool.query(
      `INSERT INTO login_attempts(email) VALUES ($1)
      ON CONFLICT(email) DO UPDATE SET
        attempts=CASE WHEN login_attempts.window_started_at < now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,
        window_started_at=CASE WHEN login_attempts.window_started_at < now()-interval '15 minutes' THEN now() ELSE login_attempts.window_started_at END
      RETURNING attempts`,
      [email],
    );
    if (attempt.rows[0].attempts > 10)
      throw new HttpError(
        429,
        "Too many sign-in attempts. Try again in 15 minutes.",
      );
    const user = (
      await pool.query("SELECT * FROM users WHERE email = $1", [email])
    ).rows[0];
    const valid = await verifyPassword(
      password,
      user?.password_hash ?? (await dummyHash),
    );
    if (!user || !valid)
      throw new HttpError(401, "Email or password is incorrect.");
    await createSession(user.id);
    await pool.query("DELETE FROM login_attempts WHERE email=$1", [email]);
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
