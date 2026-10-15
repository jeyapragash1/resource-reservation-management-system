import nextEnv from "@next/env";
import { Pool } from "pg";
import { z } from "zod";
import { hashPassword } from "../../src/backend/lib/password";
nextEnv.loadEnvConfig(process.cwd());
const [name, email, role = "member"] = process.argv.slice(2);
const result = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    role: z.enum(["member", "admin"]),
    password: z.string().min(12).max(256),
  })
  .safeParse({ name, email, role, password: process.env.CREATE_USER_PASSWORD });
if (!result.success) {
  console.error(
    'Usage: npm run user:create -- "Full Name" email@example.com member|admin. Set CREATE_USER_PASSWORD to at least 12 characters.',
  );
  process.exit(1);
}
const input = result.data;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(
    "INSERT INTO users(name,email,role,password_hash) VALUES ($1,$2,$3,$4)",
    [input.name, input.email, input.role, await hashPassword(input.password)],
  );
  console.log(`Created ${input.role} account for ${input.email}.`);
} catch (error) {
  console.error(
    (error as { code?: string }).code === "23505"
      ? "An account with this email already exists."
      : "Account creation failed. Check the database configuration.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
