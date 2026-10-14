import nextEnv from "@next/env";
import { Pool } from "pg";
import { hashPassword } from "../src/lib/password";
nextEnv.loadEnvConfig(process.cwd());
const password = process.env.SEED_PASSWORD;
if (!password || password.length < 12)
  throw new Error("Set SEED_PASSWORD to at least 12 characters in .env.local.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const hash = await hashPassword(password);
  for (const [name, email, role] of [
    ["Alex Morgan", "admin@example.com", "admin"],
    ["Sam Perera", "member@example.com", "member"],
  ]) {
    await client.query(
      "INSERT INTO users(name,email,password_hash,role) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING",
      [name, email, hash, role],
    );
  }
  const resources = [
    [
      "Cedar meeting room",
      "Meeting room",
      "Level 1 · East wing",
      8,
      "Whiteboard, display, and video conferencing.",
    ],
    [
      "Maple boardroom",
      "Meeting room",
      "Level 2 · West wing",
      16,
      "Large display and conference audio for team sessions.",
    ],
    [
      "Focus desk 01",
      "Workspace",
      "Level 1 · Quiet zone",
      1,
      "Sit-stand desk with monitor and docking station.",
    ],
    [
      "Portable projector",
      "Equipment",
      "Reception · Equipment cabinet",
      1,
      "HD projector with HDMI cable and carry case.",
    ],
    [
      "Team van",
      "Vehicle",
      "Ground floor · Parking bay 4",
      7,
      "Seven-seat vehicle for work trips. Collect keys at reception.",
    ],
  ];
  for (const row of resources)
    await client.query(
      "INSERT INTO resources(name,category,location,capacity,description) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
      row,
    );
  await client.query("COMMIT");
  console.log(
    "Seed complete. Accounts: admin@example.com and member@example.com. Existing accounts are unchanged.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
