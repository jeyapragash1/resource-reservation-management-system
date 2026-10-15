# Resource Reservation Management System

Reserve is a small internal application for managing shared rooms, workspaces, equipment, and vehicles. Team members can see availability, make reservations, edit their upcoming bookings, and cancel bookings. Administrators also maintain the resource catalog and can manage any reservation.

Built with Next.js App Router, TypeScript, React, PostgreSQL, and `pg`. PostgreSQL is the source of truth for availability and booking conflicts; the application does not use an in-memory substitute.

## Run locally

Requires Node.js 22.15 or newer, npm, and PostgreSQL 16 or newer. Docker Compose is an optional way to run the database.

```sh
npm ci
docker compose up -d db
```

Copy `.env.example` to `.env.local`. Set `SEED_PASSWORD` to a password of at least 12 characters. The example `DATABASE_URL` matches the Compose database; change it if using an existing PostgreSQL installation. `APP_URL` must match the browser origin, including the port. Local loopback aliases (`localhost` and `127.0.0.1`) are accepted on the same protocol and port.

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://127.0.0.1:3000**. Sign in as `admin@example.com` or `member@example.com` using the password you configured. The seed adds 12 example users, 12 resources, and 16 sample reservations covering upcoming, past, and cancelled bookings. Sample reservations are identified in their notes. New seeded accounts use `SEED_PASSWORD`; existing passwords are preserved. Re-running the seed does not duplicate its reservations or delete existing data. If a sample slot conflicts with an existing booking, the seed chooses another day.

The seed also adds 12 expired session fixtures and inactive login-attempt rows. These do not grant access or start a login lockout; normal authentication cleans up expired sessions. Migration history records only real migrations and is not filled with sample rows.

The migration account needs permission to create the `btree_gist` extension. On managed PostgreSQL, provision this extension first if the application account cannot create it. Use a separate limited database account for the application in a hosted environment.

To run a production build locally:

```sh
npm run build
npm start
```

Use HTTPS and a matching `APP_URL` for a hosted installation. Session cookies become secure when the production application URL uses HTTPS. Credentials belong in environment variables, not in Git.

## Behavior and decisions

- Every resource has a category, location, capacity, and optional description. Active names are unique without regard to case. Archiving hides a resource from new bookings and preserves history; active and upcoming bookings must be cancelled first.
- Reservations have one resource, one organizer, an explicit time interval, and a people/unit count. The count cannot exceed resource capacity. Start times must be in the future, and bookings may last up to seven days. Only future, active bookings can be edited. An in-progress booking can be cancelled to release its remaining time.
- All forms, schedules, and daily overview counts use **Asia/Colombo (UTC+05:30)**. The database stores `timestamptz`; the API requires timestamps with a time zone. Browser timezone settings do not change the booking's meaning.
- A PostgreSQL exclusion constraint prevents overlapping active reservations on the same resource. Its `[start, end)` ranges allow back-to-back bookings. The constraint still applies if two requests pass availability checks at the same time. Availability is a snapshot, not a guarantee until saving succeeds.
- Booking writes lock the resource row, coordinating them with resource edits and archiving. Capacity reductions cannot invalidate active bookings. Conflicting reservation edits roll back and keep the original reservation intact.
- Members can view the shared organizational schedule, including reservation titles and notes, but can only modify their own bookings. Administrators can modify any booking and maintain resources. Do not put confidential information in shared booking notes.
- Authentication uses salted scrypt password hashes and opaque, eight-hour sessions. Only token hashes are stored in PostgreSQL. Write routes verify the request origin; all routes enforce permissions on the server. Sign-in attempts are limited per email to ten in fifteen minutes.

This is a single-organization tool. Self-service registration, password recovery, email notifications, recurring bookings, approval workflows, and multi-tenant support are outside its scope. Per-email sign-in limiting is deliberately simple and is not a replacement for edge rate limits in a public deployment.

To provision another account, set `CREATE_USER_PASSWORD` (at least 12 characters) in your local environment and run `npm run user:create -- "Full Name" person@example.com member`. Use `admin` as the last argument for an administrator. On Windows PowerShell, use `npm.cmd` when forwarding arguments. This command requires database access and does not overwrite existing accounts. Remove the provisioning password from the environment when finished.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/app` | Next.js pages, layouts, API routes, and favicon |
| `src/frontend/components` | Workspace UI, forms, dialogs, and live clock |
| `src/frontend/lib` | Browser API client and resource image selection |
| `src/frontend/styles` | Application styles |
| `src/backend/lib` | Validation, session authentication, database transactions, and reservation rules |
| `src/shared` | Common types and Sri Lanka time conversion |
| `database/migrations` | Ordered SQL migrations, including constraints and indexes |
| `scripts/db` | Migration, seed, and account provisioning commands |
| `scripts/record-demo.ts` | Demonstration recording tool |
| `public/images` | Bundled resource photographs |
| `tests` | Unit, PostgreSQL integration, and browser workflow tests |
| `docs` | Assessment recording, ER diagram, verification, and submission guidance |

This is one Next.js application. Framework routes live directly in `src/app`; frontend helpers and backend services are separated under `src`. All npm commands run from the repository root.

SQL queries use bound parameters. Validation runs at request boundaries; database constraints provide a second layer for data integrity. Cancellation and resource archiving retain records rather than deleting them. Reservation lists use 20-row pages and resource/status/ownership filters. The workspace refreshes once per minute and after writes.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Integration and browser tests require a **separate test database**. Add `TEST_DATABASE_URL` to `.env.local`, for example `postgresql://reservation:reservation@localhost:5432/reservations_test`, after creating that database. Integration tests create and drop their own randomly named schema. They test real PostgreSQL constraints, simultaneous conflicting requests, adjacent slots, rollback, capacity, access permissions, cancellation, and history retention.

```sh
npm run test:integration
```

Migrate and seed the test database before the browser tests. In PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://reservation:reservation@localhost:5432/reservations_test'
npm run db:migrate
npm run db:seed
Remove-Item Env:DATABASE_URL
npm run test:e2e
```

On macOS/Linux, use `DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate` and the same prefix for `db:seed`; export the variable in your shell first. Run `npm run build` before the browser suite. Playwright loads `.env.local` and starts the production application on port 3100 against `TEST_DATABASE_URL`. Tests create identifiable test resources and cancelled reservation history in that database. They must never target a production database.

Browser tests use installed Google Chrome. If needed, run `npx playwright install chrome`. They cover login, resource creation, booking, editing, cancellation, archiving, API permissions and conflicts, availability, and a mobile viewport. The GitHub Actions workflow runs the checks with PostgreSQL; local results are documented in [verification notes](docs/verification.md).

## Assessment deliverables

- [ER diagram](docs/er-diagram.md), with a standalone [SVG](docs/er-diagram.svg).
- [3 minute 45 second demonstration video](docs/media/demo.webm), recorded from the running application with explanatory captions.
- [3–5 minute demo outline](docs/demo-outline.md).
- [Submission checklist](docs/submission-checklist.md), including the official form and deadline.

The included video can be downloaded and uploaded to a shareable location. You can also use the outline to record a narrated walkthrough. Share the ER diagram's GitHub page after pushing these files, and verify that the repository, video, and diagram links are accessible to the review team before submitting the form.

## Workspace views

The dashboard shows live usage totals and upcoming bookings. Resources use bundled category photographs; the photographs are illustrative, not images of the actual facilities. Calendar shows reservations in Sri Lanka time, including bookings spanning multiple days. Monthly reports summarize reservations starting in the selected month and export CSV. Administrators can use Manage Resources for the catalog table. Settings displays account details and the organization?s booking policy. New reservations include a review step before confirmation.

Photo sources are listed in [docs/image-sources.md](docs/image-sources.md).
