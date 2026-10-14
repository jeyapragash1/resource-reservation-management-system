import { chromium, expect } from "@playwright/test";
import nextEnv from "@next/env";
import { mkdir, readFile, rename } from "node:fs/promises";
import { toLocalInput } from "../src/lib/time";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.SEED_PASSWORD)
  throw new Error("SEED_PASSWORD is required for the local demo account.");
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: {
    dir: ".local/recordings",
    size: { width: 1440, height: 1000 },
  },
});
const page = await context.newPage();
const video = page.video()!;
async function scene(title: string, text: string) {
  await page.evaluate(
    ({ title, text }) => {
      document.getElementById("demo-caption")?.remove();
      const caption = document.createElement("section");
      caption.id = "demo-caption";
      caption.style.cssText =
        "position:fixed;bottom:0;left:0;right:0;padding:20px 40px;background:#15372e;color:white;z-index:10000;font:18px/1.5 Arial,sans-serif;border-top:3px solid #97bea5;pointer-events:none";
      const heading = document.createElement("strong");
      heading.textContent = title;
      const description = document.createElement("div");
      description.textContent = text;
      description.style.cssText = "font-size:16px;margin-top:6px;color:#e2eee4";
      caption.append(heading, description);
      document.body.append(caption);
    },
    { title, text },
  );
  console.log(`Recording: ${title}`);
  await page.waitForTimeout(17000);
}
try {
  await page.goto(`${process.env.APP_URL}/login`);
  await page.getByLabel("Email address").fill("admin@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your workspace, at a glance" }),
  ).toBeVisible();
  await scene(
    "Shared resources, one reliable schedule",
    "Reserve replaces informal booking messages with a shared resource catalog, availability checks, and a reservation history. This recording demonstrates the running local application.",
  );
  await scene(
    "An operational overview",
    "The overview shows active resources, resources in use, today’s reservations, and your upcoming bookings. All booking times and calendar-day counts use Sri Lanka time, regardless of the browser timezone.",
  );
  await page.getByRole("link", { name: "Resources", exact: true }).click();
  await expect(page.locator("article").first()).toBeVisible();
  await scene(
    "Find a suitable resource",
    "Search by name, location, or description, then filter by category. Each resource has a location and capacity so teams can choose an appropriate room, workspace, item, or vehicle.",
  );
  await page.getByRole("button", { name: "Add resource", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const resourceName = `Orchid workshop room ${new Date().toISOString().slice(0, 10)}`;
  await dialog.getByLabel("Resource name").fill(resourceName);
  await dialog
    .getByLabel("Location", { exact: true })
    .fill("Level 3 · South wing");
  await dialog.getByLabel("Capacity", { exact: true }).fill("8");
  await dialog
    .getByLabel("Description")
    .fill("Workshop table, display, and whiteboard.");
  await dialog
    .getByRole("button", { name: "Add resource", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("searchbox").fill("Orchid");
  await scene(
    "Administrators maintain the catalog",
    "Administrators add and edit resources. Members can browse and book them, but the server rejects resource changes from member accounts. Resource names are unique among active resources.",
  );
  const start = toLocalInput(new Date(Date.now() + 86400000).toISOString());
  const end = toLocalInput(new Date(Date.now() + 90000000).toISOString());
  await page.getByLabel("From", { exact: true }).fill(start);
  await page.getByLabel("Until", { exact: true }).fill(end);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  const card = page.locator("article").filter({ hasText: resourceName });
  await expect(card).toContainText("Available");
  await scene(
    "Check a real time interval",
    "Availability comes from PostgreSQL and checks the full selected interval. Available means no active booking overlaps that period. The selected interval carries into the reservation form.",
  );
  await card.getByRole("button", { name: "Reserve", exact: true }).click();
  await dialog
    .getByLabel("Reservation title")
    .fill("Quarterly planning workshop");
  await dialog.getByLabel("People / units").fill("6");
  await dialog
    .getByLabel("Notes")
    .fill("Planning session for the product team.");
  await dialog.getByRole("button", { name: "Confirm reservation" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(card).toContainText("Reserved");
  await scene(
    "Reserve with clear ownership",
    "A reservation records its resource, organizer, title, time interval, attendee count, and optional shared notes. The server rejects past start times, invalid intervals, excessive duration, and capacity violations.",
  );
  await card.getByRole("button", { name: "Reserve", exact: true }).click();
  await dialog.getByLabel("Reservation title").fill("Conflicting workshop");
  await dialog.getByRole("button", { name: "Confirm reservation" }).click();
  await expect(dialog.getByRole("alert")).toContainText("already reserved");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await scene(
    "Overlapping reservations are rejected",
    "The second booking was rejected. A PostgreSQL exclusion constraint enforces this rule even when requests arrive simultaneously. Half-open time ranges allow adjacent bookings, such as 09:00–10:00 followed by 10:00–11:00.",
  );
  await card.getByRole("link", { name: "Schedule" }).click();
  let row = page
    .getByRole("row")
    .filter({ hasText: "Quarterly planning workshop" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await dialog
    .getByLabel("Reservation title")
    .fill("Quarterly planning and review");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await scene(
    "Changes are validated again",
    "Members edit their own upcoming reservations; administrators can manage any booking. Editing rechecks the new time and capacity. A conflicting edit rolls back, preserving the original reservation.",
  );
  row = page
    .getByRole("row")
    .filter({ hasText: "Quarterly planning and review" });
  await row.getByRole("button", { name: "Cancel", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("combobox", { name: "Reservation status" })
    .selectOption("cancelled");
  await expect(row).toContainText("Cancelled");
  await scene(
    "Release a slot without losing history",
    "Cancellation frees the resource’s time slot and records who cancelled the booking. The cancelled entry remains visible in history. Completed reservations cannot be rewritten or cancelled.",
  );
  await page.getByRole("link", { name: "Resources", exact: true }).click();
  await page.getByRole("searchbox").fill("Orchid");
  await card.getByRole("button", { name: "Archive", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Archive resource", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel("Include archived").check();
  await expect(card).toContainText("Archived");
  await scene(
    "Retire resources safely",
    "Archiving retains the resource and its history while preventing new bookings. Active and upcoming reservations block archiving. Capacity reductions also cannot invalidate an existing active booking.",
  );
  const svg = await readFile("docs/er-diagram.svg", "utf8");
  await page.setContent(
    `<body style="margin:0;background:#f6f8f5;display:flex;justify-content:center"><div style="height:870px">${svg.replace('width="1120" height="960"', 'width="1015" height="870"')}</div></body>`,
  );
  await scene(
    "A focused relational model",
    "Users organize reservations and hold expiring sessions. Each reservation belongs to one resource. Foreign keys retain these relationships; cancellation stores the cancelling user. Sessions store token hashes, and passwords use salted scrypt hashes.",
  );
  const sql = await readFile("db/migrations/001_initial.sql", "utf8");
  const constraint = sql.slice(
    sql.indexOf("CONSTRAINT reservations_no_overlap"),
    sql.indexOf("CREATE TABLE login_attempts"),
  );
  await page.setContent(
    '<body style="background:#f6f8f5;color:#20332e;padding:60px;font:20px Arial"><h1>Reliability at the database boundary</h1><pre id="sql" style="font:20px/1.7 monospace;background:white;border:1px solid #dce3de;padding:30px;white-space:pre-wrap"></pre><p>Next.js App Router · TypeScript · PostgreSQL</p></body>',
  );
  await page.locator("#sql").evaluate((node, text) => {
    node.textContent = text;
  }, constraint);
  await scene(
    "Verification and engineering choices",
    "Parameterized SQL, validated inputs, resource row locks, and a database overlap constraint keep the design small and reliable. The repository includes unit tests, real PostgreSQL integration tests, browser workflows, setup instructions, and the ER diagram.",
  );
  await context.close();
  await mkdir("docs/media", { recursive: true });
  await rename(await video.path(), "docs/media/demo.webm");
  console.log("Saved docs/media/demo.webm");
} finally {
  await browser.close();
}
