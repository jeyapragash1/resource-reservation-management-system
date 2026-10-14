import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { pool } from "./db";
import { HttpError } from "./http";
import type { User } from "./types";
const cookieName = "reservation_session";
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const result = await pool.query<User>(
    `SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [digest(token)],
  );
  return result.rows[0] ?? null;
}
export async function requireUser(admin = false) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  if (admin && user.role !== "admin")
    throw new HttpError(403, "Administrator access is required.");
  return user;
}
export async function requirePageUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await pool.query("DELETE FROM sessions WHERE expires_at <= now()");
  await pool.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,$3)",
    [digest(token), userId, expires],
  );
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" &&
      new URL(process.env.APP_URL!).protocol === "https:",
    sameSite: "lax",
    path: "/",
    expires,
  });
}
export async function deleteSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token)
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [
      digest(token),
    ]);
  jar.delete(cookieName);
}
