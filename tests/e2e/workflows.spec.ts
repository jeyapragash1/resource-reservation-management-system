import { test, expect, type Page } from "@playwright/test";
import { fromLocalInput, toLocalInput } from "../../src/shared/time";
const origin = "http://127.0.0.1:3100";
async function signIn(page: Page, role: "admin" | "member") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(`${role}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_PASSWORD!);
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/auth/login"),
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
test("admin creates a resource, books it, edits it, cancels it, and archives it", async ({
  page,
}) => {
  await signIn(page, "admin");
  await page.getByRole("link", { name: "Resources", exact: true }).click();
  await page.getByRole("button", { name: "Add resource", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const name = `Test room ${Date.now()}`;
  await dialog.getByLabel("Resource name").fill(name);
  await dialog.getByLabel("Location", { exact: true }).fill("Level 3");
  await dialog.getByLabel("Capacity", { exact: true }).fill("6");
  await dialog
    .getByRole("button", { name: "Add resource", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Reserve", exact: true }).click();
  const start = toLocalInput(new Date(Date.now() + 86400000).toISOString());
  const end = toLocalInput(new Date(Date.now() + 90000000).toISOString());
  await dialog.getByLabel("Reservation title").fill("Engineering planning");
  await dialog.getByLabel("Start time", { exact: true }).fill(start);
  await dialog.getByLabel("End time", { exact: true }).fill(end);
  await dialog.getByLabel("People / units").fill("4");
  await dialog.getByRole("button", { name: "Review reservation" }).click();
  await dialog.getByRole("button", { name: "Confirm reservation" }).click();
  await expect(dialog).not.toBeVisible();
  await card.getByRole("link", { name: "Schedule" }).click();
  const row = page.getByRole("row").filter({ hasText: "Engineering planning" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await dialog.getByLabel("Reservation title").fill("Engineering review");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Engineering review" }),
  ).toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: "Engineering review" })
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("combobox", { name: "Reservation status" })
    .selectOption("cancelled");
  await expect(
    page.getByRole("row").filter({ hasText: "Engineering review" }),
  ).toContainText("Cancelled");
  await page.getByRole("link", { name: "Resources", exact: true }).click();
  await card.getByRole("button", { name: "Archive", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Archive resource", exact: true })
    .click();
  await expect(card).not.toBeVisible();
  await page.getByLabel("Include archived").check();
  await expect(card).toContainText("Archived");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});
test("API protects permissions, CSRF, booking conflicts, capacity, and archiving", async ({
  browser,
}) => {
  const adminContext = await browser.newContext(),
    memberContext = await browser.newContext();
  const adminPage = await adminContext.newPage(),
    memberPage = await memberContext.newPage();
  await signIn(adminPage, "admin");
  await signIn(memberPage, "member");
  const admin = adminContext.request,
    member = memberContext.request;
  const headers = { origin };
  const resource = {
    name: `API room ${Date.now()}`,
    category: "Meeting room",
    location: "Test wing",
    capacity: 4,
    description: "",
  };
  expect(
    (await member.post("/api/resources", { headers, data: resource })).status(),
  ).toBe(403);
  expect(
    (
      await admin.post("/api/resources", {
        headers: { origin: "https://other.example" },
        data: resource,
      })
    ).status(),
  ).toBe(403);
  const created = await admin.post("/api/resources", {
    headers,
    data: resource,
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const start = toLocalInput(new Date(Date.now() + 172800000).toISOString()),
    end = toLocalInput(new Date(Date.now() + 176400000).toISOString());
  const booking = {
    resource_id: id,
    title: "API booking",
    notes: "",
    attendees: 2,
    starts_at: fromLocalInput(start),
    ends_at: fromLocalInput(end),
  };
  const responses = await Promise.all([
    member.post("/api/reservations", { headers, data: booking }),
    admin.post("/api/reservations", { headers, data: booking }),
  ]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
  const saved = await responses.find((r) => r.status() === 201)!.json();
  expect(
    (await admin.delete(`/api/resources/${id}`, { headers })).status(),
  ).toBe(409);
  expect(
    (
      await admin.patch(`/api/resources/${id}`, {
        headers,
        data: { ...resource, capacity: 1 },
      })
    ).status(),
  ).toBe(409);
  const availability = await member.get(
    `/api/resources?start=${encodeURIComponent(booking.starts_at)}&end=${encodeURIComponent(booking.ends_at)}`,
  );
  expect(
    (await availability.json()).find((r: { id: string }) => r.id === id)
      .available,
  ).toBe(false);
  await admin.delete(`/api/reservations/${saved.id}`, { headers });
  expect(
    (
      await member.post("/api/reservations", {
        headers,
        data: { ...booking, attendees: 5 },
      })
    ).status(),
  ).toBe(400);
  const fresh = await admin.post("/api/reservations", {
    headers,
    data: booking,
  });
  expect(fresh.status()).toBe(201);
  const freshId = (await fresh.json()).id;
  expect(
    (await member.delete(`/api/reservations/${freshId}`, { headers })).status(),
  ).toBe(403);
  expect(
    (
      await member.patch(`/api/reservations/${freshId}`, {
        headers,
        data: booking,
      })
    ).status(),
  ).toBe(403);
  await admin.delete(`/api/reservations/${freshId}`, { headers });
  const paginated = await Promise.all(
    Array.from({ length: 21 }, async (_, index) => {
      const start = Date.now() + 10 * 86400000 + index * 3600000;
      const response = await admin.post("/api/reservations", {
        headers,
        data: {
          ...booking,
          title: `Pagination ${index}`,
          starts_at: new Date(start).toISOString(),
          ends_at: new Date(start + 1800000).toISOString(),
        },
      });
      expect(response.status()).toBe(201);
      return (await response.json()).id as string;
    }),
  );
  for (const [page, size] of [
    [1, 20],
    [2, 1],
    [3, 0],
  ]) {
    const result = await (
      await admin.get(
        `/api/reservations?resource=${id}&status=upcoming&page=${page}`,
      )
    ).json();
    expect(result.total).toBe(21);
    expect(result.items).toHaveLength(size);
  }
  const mine = await (
    await member.get(
      `/api/reservations?resource=${id}&scope=mine&status=upcoming`,
    )
  ).json();
  expect(mine.total).toBe(0);
  await Promise.all(
    paginated.map((bookingId) =>
      admin.delete(`/api/reservations/${bookingId}`, { headers }),
    ),
  );
  expect(
    (await admin.delete(`/api/resources/${id}`, { headers })).status(),
  ).toBe(200);
  expect(
    (
      await member.post("/api/reservations", { headers, data: booking })
    ).status(),
  ).toBe(409);
  await adminContext.close();
  await memberContext.close();
});
test("unauthenticated requests and repeated invalid logins are rejected", async ({
  request,
}) => {
  expect((await request.get("/api/resources")).status()).toBe(401);
  const data = {
    email: `unknown-${Date.now()}@example.com`,
    password: "invalid-password",
  };
  for (let attempt = 0; attempt < 10; attempt++) {
    expect(
      (
        await request.post("/api/auth/login", { headers: { origin }, data })
      ).status(),
    ).toBe(401);
  }
  expect(
    (
      await request.post("/api/auth/login", { headers: { origin }, data })
    ).status(),
  ).toBe(429);
});
test("mobile resources and sign-in errors remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email address").fill("member@example.com");
  await page.getByLabel("Password", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "incorrect",
  );
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Resources", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Resources" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add resource", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("searchbox", { name: "Search resources" })
    .fill("no matching resource");
  await expect(
    page.getByRole("heading", { name: "No resources found" }),
  ).toBeVisible();
});

test("localhost sign-in redirects protected pages without authentication errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://localhost:3100/overview");
  await expect(page).toHaveURL("http://localhost:3100/login");
  await page.getByLabel("Email address").fill("member@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_PASSWORD!);
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/auth/login"),
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("calendar, reports, resource management and redesigned screens work", async ({
  page,
}) => {
  await page.goto("/login");
  await page.screenshot({ path: "test-results/ui-login.png", fullPage: true });
  await page.getByLabel("Password", { exact: true }).fill("example-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await signIn(page, "admin");
  await expect(page.locator(".stat strong").first()).toHaveText(/\d+/);
  await page.screenshot({
    path: "test-results/ui-dashboard.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Resources", exact: true }).click();
  await expect(page.locator(".resource-photo").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/ui-resources.png",
    fullPage: true,
  });
  await page
    .locator("article")
    .first()
    .getByRole("button", { name: "Reserve", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/ui-booking.png",
    fullPage: true,
  });
  await page
    .getByRole("dialog")
    .getByLabel("Reservation title")
    .fill("Project planning meeting");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Review reservation" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Project planning meeting",
  );
  await page.screenshot({
    path: "test-results/ui-confirmation.png",
    fullPage: true,
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  const created = await page.request.post("/api/reservations", {
    headers: { origin },
    data: {
      resource_id: (await (await page.request.get("/api/resources")).json())[0]
        .id,
      title: `Calendar check ${Date.now()}`,
      notes: "UI verification",
      attendees: 1,
      starts_at: new Date(Date.now() + 48 * 3600000).toISOString(),
      ends_at: new Date(Date.now() + 49 * 3600000).toISOString(),
    },
  });
  expect(created.status()).toBe(201);
  const booking = await created.json();
  try {
    const month = toLocalInput(booking.starts_at).slice(0, 7);
    const monthResponse = await page.request.get(
      `/api/reservations?status=upcoming&month=${month}&resource=${booking.resource_id}`,
    );
    expect(monthResponse.status()).toBe(200);
    expect(
      (await monthResponse.json()).items.some(
        (item: { id: string }) => item.id === booking.id,
      ),
    ).toBe(true);
    expect(
      (await page.request.get("/api/reservations?month=2026-13")).status(),
    ).toBe(400);
    await page.getByRole("link", { name: "Calendar", exact: true }).click();
    await expect(
      page.getByRole("button").filter({ hasText: booking.title }),
    ).toBeVisible();
    await page.getByRole("button").filter({ hasText: booking.title }).click();
    await expect(page.getByRole("dialog")).toContainText("UI verification");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close dialog" })
      .click();
    await page.screenshot({
      path: "test-results/ui-calendar.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: "Reports", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Bookings by resource" }),
    ).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    expect((await download).suggestedFilename()).toMatch(
      /^reservations-\d{4}-\d{2}\.csv$/,
    );
    await page
      .getByRole("link", { name: "Manage Resources", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Manage Resources" }),
    ).toBeVisible();
    await expect(
      page.locator(".management-table tbody tr").first(),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/ui-management.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page.locator(".settings-panel")).toContainText(
      "admin@example.com",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/calendar");
    await expect(page.locator(".calendar-grid")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/ui-mobile.png",
      fullPage: true,
    });
  } finally {
    await page.request.delete(`/api/reservations/${booking.id}`, {
      headers: { origin },
    });
  }
});
