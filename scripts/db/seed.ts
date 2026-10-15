import nextEnv from "@next/env";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "../../src/backend/lib/password";
import { fromLocalInput, toLocalInput } from "../../src/shared/time";

nextEnv.loadEnvConfig(process.cwd());
const password = process.env.SEED_PASSWORD;
if (!password || password.length < 12)
  throw new Error(
    "Set SEED_PASSWORD to at least 12 characters before seeding.",
  );
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const users = [
  ["Alex Morgan", "admin@example.com", "admin"],
  ["Sam Perera", "member@example.com", "member"],
  ["Tharindu Silva", "tharindu@example.com", "member"],
  ["Nimali Perera", "nimali@example.com", "member"],
  ["Kasun Fernando", "kasun@example.com", "member"],
  ["Dinusha Madushani", "dinusha@example.com", "member"],
  ["Kavindi Jayasinghe", "kavindi@example.com", "member"],
  ["Ravindu Senanayake", "ravindu@example.com", "member"],
  ["Ishara Wijesinghe", "ishara@example.com", "member"],
  ["Dilshan Gunawardena", "dilshan@example.com", "member"],
  ["Amaya Rathnayake", "amaya@example.com", "member"],
  ["Priyanthi De Silva", "priyanthi@example.com", "admin"],
];
const resources: [string, string, string, number, string][] = [
  [
    "Cedar meeting room",
    "Meeting room",
    "Level 1 - East wing",
    8,
    "Whiteboard, display, and video conferencing.",
  ],
  [
    "Maple boardroom",
    "Meeting room",
    "Level 2 - West wing",
    16,
    "Large display and conference audio for team sessions.",
  ],
  [
    "Focus desk 01",
    "Workspace",
    "Level 1 - Quiet zone",
    1,
    "Sit-stand desk with monitor and docking station.",
  ],
  [
    "Portable projector",
    "Equipment",
    "Reception - Equipment cabinet",
    1,
    "HD projector with HDMI cable and carry case.",
  ],
  [
    "Team van",
    "Vehicle",
    "Ground floor - Parking bay 4",
    7,
    "Seven-seat vehicle for work trips. Collect keys at reception.",
  ],
  [
    "Birch meeting room",
    "Meeting room",
    "Level 1 - North wing",
    6,
    "Small meeting room with display and whiteboard.",
  ],
  [
    "Willow training room",
    "Meeting room",
    "Level 2 - Training wing",
    24,
    "Training room with flexible seating and presentation screen.",
  ],
  [
    "Elm interview room",
    "Meeting room",
    "Level 1 - Reception wing",
    4,
    "Quiet room for interviews and individual discussions.",
  ],
  [
    "Focus desk 02",
    "Workspace",
    "Level 1 - Quiet zone",
    1,
    "Adjustable desk with dual monitors and USB-C docking station.",
  ],
  [
    "Team workspace",
    "Workspace",
    "Level 2 - Collaboration zone",
    6,
    "Shared project area with six desks and a planning board.",
  ],
  [
    "Portable whiteboard",
    "Equipment",
    "Level 1 - Storage room",
    1,
    "Mobile double-sided whiteboard with markers and eraser.",
  ],
  [
    "Pool car",
    "Vehicle",
    "Ground floor - Parking bay 2",
    4,
    "Four-seat vehicle for local business travel.",
  ],
];
type Booking = [
  resource: string,
  email: string,
  title: string,
  days: number,
  hour: number,
  hours: number,
  attendees: number,
  cancelled: boolean,
];
const bookings: Booking[] = [
  [
    "Cedar meeting room",
    "member@example.com",
    "Product planning",
    1,
    9,
    1,
    5,
    false,
  ],
  [
    "Maple boardroom",
    "tharindu@example.com",
    "Architecture review",
    1,
    10,
    2,
    10,
    false,
  ],
  [
    "Focus desk 01",
    "nimali@example.com",
    "Research focus session",
    1,
    9,
    3,
    1,
    false,
  ],
  [
    "Portable projector",
    "kasun@example.com",
    "Client presentation setup",
    2,
    13,
    2,
    1,
    false,
  ],
  ["Team van", "dinusha@example.com", "Customer site visit", 2, 9, 6, 5, false],
  [
    "Birch meeting room",
    "kavindi@example.com",
    "Design feedback",
    2,
    10,
    1,
    4,
    false,
  ],
  [
    "Willow training room",
    "ravindu@example.com",
    "Engineering workshop",
    3,
    9,
    3,
    18,
    false,
  ],
  [
    "Team workspace",
    "ishara@example.com",
    "Sprint collaboration",
    3,
    13,
    3,
    6,
    false,
  ],
  [
    "Elm interview room",
    "priyanthi@example.com",
    "Candidate interview",
    -2,
    10,
    1,
    3,
    false,
  ],
  [
    "Focus desk 02",
    "dilshan@example.com",
    "Documentation session",
    -3,
    9,
    2,
    1,
    false,
  ],
  [
    "Portable whiteboard",
    "amaya@example.com",
    "Retrospective preparation",
    -4,
    14,
    1,
    1,
    false,
  ],
  ["Pool car", "admin@example.com", "Supplier visit", -5, 9, 4, 2, false],
  [
    "Cedar meeting room",
    "member@example.com",
    "Rescheduled team check-in",
    4,
    11,
    1,
    4,
    true,
  ],
  [
    "Maple boardroom",
    "tharindu@example.com",
    "Cancelled stakeholder review",
    5,
    14,
    1,
    8,
    true,
  ],
  [
    "Birch meeting room",
    "nimali@example.com",
    "Rescheduled discovery session",
    -6,
    10,
    1,
    3,
    true,
  ],
  [
    "Pool car",
    "kasun@example.com",
    "Cancelled branch visit",
    -7,
    9,
    3,
    2,
    true,
  ],
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(713290)");
  const userIds = new Map<string, string>();
  for (const [name, email, role] of users) {
    const existing = await client.query("SELECT id FROM users WHERE email=$1", [
      email,
    ]);
    if (existing.rows.length) userIds.set(email, existing.rows[0].id);
    else {
      const result = await client.query(
        "INSERT INTO users(name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id",
        [name, email, await hashPassword(password), role],
      );
      userIds.set(email, result.rows[0].id);
    }
  }
  const resourceIds = new Map<string, { id: string; capacity: number }>();
  for (const row of resources) {
    await client.query(
      "INSERT INTO resources(name,category,location,capacity,description) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
      row,
    );
    const result = await client.query(
      "SELECT id,capacity FROM resources WHERE lower(name)=lower($1) AND archived_at IS NULL",
      [row[0]],
    );
    resourceIds.set(row[0], result.rows[0]);
  }
  const today = toLocalInput(new Date().toISOString()).slice(0, 10);
  for (const [
    index,
    [name, email, title, days, hour, hours, attendees, cancelled],
  ] of bookings.entries()) {
    const id = `dc6e1447-3d8f-4ad9-955c-${String(index + 1).padStart(12, "0")}`;
    if (
      (await client.query("SELECT id FROM reservations WHERE id=$1", [id])).rows
        .length
    )
      continue;
    const resource = resourceIds.get(name)!;
    let inserted = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const offset = days + (days < 0 ? -attempt : attempt);
      const date = new Date(`${today}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      const start = fromLocalInput(
        `${date.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:00`,
      );
      const end = new Date(
        new Date(start).getTime() + hours * 3600000,
      ).toISOString();
      const created = new Date(
        new Date(start).getTime() - 86400000,
      ).toISOString();
      const cancelledAt = cancelled
        ? new Date(new Date(created).getTime() + 3600000).toISOString()
        : null;
      const result = await client.query(
        `INSERT INTO reservations(id,resource_id,user_id,title,notes,starts_at,ends_at,attendees,cancelled_at,cancelled_by,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) ON CONFLICT DO NOTHING RETURNING id`,
        [
          id,
          resource.id,
          userIds.get(email),
          title,
          "Sample reservation added by the database seed.",
          start,
          end,
          Math.min(attendees, resource.capacity),
          cancelledAt,
          cancelled ? userIds.get(email) : null,
          created,
        ],
      );
      if (result.rows.length) {
        inserted = true;
        break;
      }
    }
    if (!inserted)
      throw new Error(
        `Could not find a free sample slot for ${name}. Existing bookings were preserved.`,
      );
  }
  for (const [, email] of users) {
    const tokenHash = createHash("sha256")
      .update(`expired-seed-session:${email}`)
      .digest("hex");
    await client.query(
      `INSERT INTO sessions(token_hash,user_id,expires_at,created_at)
       VALUES ($1,$2,now()-interval '1 day',now()-interval '2 days') ON CONFLICT DO NOTHING`,
      [tokenHash, userIds.get(email)],
    );
    await client.query(
      "INSERT INTO login_attempts(email,attempts,window_started_at) VALUES ($1,0,now()-interval '1 day') ON CONFLICT DO NOTHING",
      [email],
    );
  }
  const counts =
    await client.query(`SELECT (SELECT count(*)::int FROM users) AS users,
    (SELECT count(*)::int FROM resources) AS resources, (SELECT count(*)::int FROM reservations) AS reservations,
    (SELECT count(*)::int FROM sessions) AS sessions, (SELECT count(*)::int FROM login_attempts) AS login_attempts`);
  await client.query("COMMIT");
  console.log(
    "Sample data seeded. Existing accounts, passwords, and bookings were preserved.",
  );
  console.table(counts.rows);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
