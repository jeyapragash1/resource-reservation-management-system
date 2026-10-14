# Verification

Verified locally on 12 October 2026 using Node.js 22.15.0, PostgreSQL 18.6, and installed Google Chrome on Windows. The final application uses Next.js 16.4.0.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed without warnings |
| `npm test` | 30 tests passed |
| `npm run test:integration` | 8 tests passed against PostgreSQL |
| `npm run test:e2e` | 5 tests passed against the production build |
| `npm run build` | Passed; pages and route handlers generated successfully |
| `npm audit --omit=dev` | Zero reported production dependency vulnerabilities |

The integration suite verified simultaneous overlapping requests, adjacent bookings, bookings on separate resources, cancellation and rebooking, organizer/admin permissions, rollback of conflicting edits, capacity and archive checks, invalid database ranges, and protection of completed reservations.

The browser suite verified resource creation, booking, editing, cancellation history, archiving, availability queries, capacity reduction protection, origin checks, ownership permissions, pagination (including an empty page with the correct total), sign-in rate limits, a 390px mobile viewport without horizontal overflow, and sign-in through the localhost alias after an unauthenticated protected-page redirect.

Account provisioning was separately checked against the test database: a new member could be created, its password hash verified, and a duplicate email rejected. The temporary account was removed after that check. The SVG ER diagram was rendered and inspected in a local browser.

The captioned demonstration video was recorded from the production application. Its duration was verified in Chrome as 225.16 seconds (3 minutes 45 seconds), and its final frame was inspected. The file is `docs/media/demo.webm`.

The final development server was also smoke-tested in Chrome: sign-in succeeded, the overview loaded, and its resource, reservation, and overview API requests returned HTTP 200 without error notices.

For the prepared Windows checkout, the ignored `.env.local` points to the native test setup on port 55432. Database files are retained in `.local/pgdata`. After teardown, start that database in a separate terminal from the repository root, then run `npm run dev` in another terminal:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\postgres.exe' -D .local\pgdata -p 55432 -h 127.0.0.1
```

This path is specific to the local verification machine. A fresh clone should follow the portable database setup in the README instead.

The Docker Compose recipe and GitHub Actions workflow are included but were not executed during local verification. No remote deployment, repository push, or assessment-form submission has been performed. The local diagram files are available for review and publication; no external shareable diagram link has been verified.
