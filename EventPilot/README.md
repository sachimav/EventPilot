# EventPilot

An offline event planner built with Expo Router and SQLite. Create an event, then
open its workspace to manage tasks, expenses, and scheduled activities.

## Open the app

Run commands from this directory (the one containing `package.json`).

```sh
npm install
npm run web
```

For the built web app:

```sh
npm run build:web
npm run preview
```

Open **http://127.0.0.1:4173**. The preview server supplies SQLite's required
cross-origin isolation headers and supports direct links into event screens.
Rebuild after changing source code; old exports do not update themselves.
Use `npm start` and the displayed Expo instructions for Android/iOS.

## Working actions

- Home: Create Event, My Events, Manage Tasks, and Track Expenses.
- My Events: search/filter saved events, create an event, and open its details.
- Event Details: edit/delete the event and open its Tasks, Budget, and Timeline.
- Tasks: create/edit/delete, complete/reopen, inspect descriptions, and filter.
- Budget: select an event, add/edit/delete expenses, compare estimates and actuals.
- Timeline: add/edit/delete activities, with overlap warnings and explicit override.
- Guests: RSVP records, plus-ones, dietary needs, and manual check-in.
- Vendors: contacts, quotes, bookings, and links to expense records.
- Payments: deposits/settlements, outstanding balances, payment deadlines, and web receipt attachments.
- Calendar: monthly agenda and calendar export with 24-hour calendar alarms.
- Reports: printable event brief and guest/expense CSV downloads.
- Templates: wedding, birthday and conference checklists plus unscheduled activity plans.
- Recovery: JSON backup/import, archive, event Trash and restore.
- Reminders: saved in-app follow-ups surfaced on Home when due.

Event forms support lifecycle status and optional end date/time. Duplication creates
a draft with checklist/expense/activity plans, clearing dates, completion and actual
spending. Guests, vendors and payment history are not copied. Normal event deletion
moves the event to Trash; permanent deletion from Data & recovery requires confirmation.

Forms validate required fields; deletion requires confirmation. No event is seeded
automatically. Create your first event to unlock its task and expense controls.
All records persist locally. Browser data belongs to the browser profile and
origin; Android/iOS data belongs to that app installation.

## Verification

```sh
npm run typecheck
npm run lint
npm run build:web
npm run test:e2e
```

Browser tests use Microsoft Edge and an isolated browser profile, exercising real
SQLite rather than mocks. They cover event/task/expense/activity CRUD, completion,
validation, persistence after reload, and schedule-conflict confirmation. On a
machine without Edge, configure a Playwright browser in `playwright.config.cjs`.
Additional SQLite/calculation tests are in `scripts/test-*.cjs` and require Node 24+.
See `DATABASE.md` for schema, migration, and calculation details.

This remains an offline planner. It does not provide public registration, accounts,
multi-user collaboration, cloud sync, SMS/email delivery, or ticket payment processing.
In-app reminders do not run when the browser is closed. Calendar alarms are delivered
by the calendar app after import. Browser downloads include backups, reports, and
receipts; native exports use the system text share sheet and native restore accepts
pasted JSON. Receipt file uploads/downloads currently require the web app.
