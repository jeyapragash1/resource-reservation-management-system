# Demonstration recording outline

The repository includes a [3 minute 45 second captioned screen recording](media/demo.webm) of the actual running application. It demonstrates resource management, availability, reservation conflicts, editing, cancellation, archiving, and the database design. It has no audio narration.

If you prefer a narrated demonstration, use this outline to record a 3–5 minute walkthrough. To recreate the captioned recording, start the production application with `npm start`, install the encoder with `npx playwright install ffmpeg`, and run `npm run demo:record`. This command uses the seeded admin account and creates, books, cancels, and archives a demonstration resource; use a local demo database.

| Time | Show and explain |
| --- | --- |
| 0:00–0:30 | Sign in. Explain the problem: shared resources, informal scheduling, and overlapping bookings. Show the overview and Sri Lanka time labels. |
| 0:30–1:15 | Browse resources and search by name or location. Select a category and check availability for a particular interval. |
| 1:15–2:15 | Reserve a room with a title and attendee count. Show the reservation on its schedule. Attempt another reservation in the same slot and show the conflict message. |
| 2:15–3:00 | Edit your reservation, then cancel it. Show it in cancelled history. Check that the released slot can be booked again. |
| 3:00–3:40 | Sign in as administrator. Add or edit a resource. Explain why resources with active bookings cannot be archived and why capacity cannot invalidate existing bookings. |
| 3:40–4:30 | Show the ER diagram and the PostgreSQL exclusion constraint. Explain the resource row lock, session authentication, member/admin permissions, and the tests you actually ran. |

Use a clean demo database, readable browser zoom, and a recording without passwords or environment variables on screen. If you mention a test result, run the command first and show its real result.

Upload the recording to a shareable location. Check the link from a signed-out browser before submitting it. The same access check applies to the GitHub repository and ER diagram.
