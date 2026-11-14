# Offline database

`src/database/index.ts` exports the database initializer and typed repositories.
The root layout waits for initialization before mounting the router. Failures
show a retry button; failed opens close their connection and can be retried.
Event list, create, edit, details, and delete screens use the repositories. Lists
reload whenever their screen regains focus. Task and budget screens remain previews.

The `eventpilot.db` file persists locally across app restarts. No network or
server is required. WAL mode is enabled, along with foreign keys on every open.

## Schema (version 2)

All four tables have an auto-incrementing integer `id` primary key and UTC
`created_at` / `updated_at` timestamps. Repository updates refresh `updated_at`.

| Table | Fields |
| --- | --- |
| Events | Required `name`; optional `date`, `time`; `category` (default `Other`); `location`, `notes`; nonnegative integer `budget_cents`; three-character `currency` (default `LKR`) |
| Tasks | Required `event_id`, `title`; `notes`, optional `due_at`; `completed` as SQLite integer 0 or 1 |
| Expenses | Required `event_id`, `title`, nonnegative integer `amount_cents`; `category`, `notes`, optional `incurred_at` |
| Activities | Required `event_id`, `title`; optional `starts_at`, `ends_at`; `location`, `notes` |

Every child `event_id` references `Events.id` with `ON DELETE CASCADE`, so deleting
an event also deletes its tasks, expenses, and timeline activities. Each foreign
key is indexed. Activities represent scheduled timeline entries, not audit logs.
Required names/titles reject whitespace-only text. An activity's end cannot precede
its start. Use normalized UTC ISO 8601 strings for timestamps (including activity
start/end, whose constraint compares text); event dates use `YYYY-MM-DD`. Missing
dates are `null`; unspecified notes/locations/categories default to empty strings.
All monetary amounts use integer minor units (100 cents per LKR), avoiding floating
point rounding. Expenses inherit the parent event's currency; there is no currency
conversion. Applications should validate date formats and currency codes before saving.

The event form labels `name` as title and `notes` as description. It requires title,
category, date, time, location, and a nonnegative budget with at most two decimal
places. Description is optional. Event date/time are local wall values stored as
`YYYY-MM-DD` and `HH:mm`; they do not undergo UTC conversion. Native platforms use
the system date/time picker, and web uses browser date/time inputs. Version 2 adds
category/time without changing existing rows; older events receive category `Other`
and an unset time, which the edit form asks the user to fill in before saving.
Deletion requires explicit confirmation and warns about cascading child records.

## Migrations

`schema.ts` contains ordered, append-only migrations. Initialization reads
`PRAGMA user_version`, runs pending migrations, and updates the version in a single
transaction. A failure rolls back both schema and version. A newer database version
is rejected rather than overwritten. There is no destructive reset or sample seeding.
All callers share one initialization promise; helpers wait for it automatically.
The connection remains open for the app lifetime. Do not close it from a screen.

## CRUD

```ts
import { events, tasks, expenses, activities } from './src/database';

const eventId = await events.create({ name: 'Celebration', budget_cents: 500000 });
await tasks.create({ event_id: eventId, title: 'Book venue' });
await expenses.create({ event_id: eventId, title: 'Deposit', amount_cents: 100000 });
await activities.create({ event_id: eventId, title: 'Welcome', starts_at: '2026-12-01T10:00:00.000Z' });
const allEvents = await events.list();
const eventTasks = await tasks.listByEvent(eventId);
const event = await events.getById(eventId); // row or null
await events.update(eventId, { notes: 'Confirmed' }); // true if found
await events.delete(eventId); // true if found; cascades to children
```

Each repository exposes `create`, `getById`, `update`, and `delete`; child
repositories also expose `listByEvent`. Creates return the new integer ID.
Updates are partial; omit unused fields, use `null` only for nullable dates.
Empty updates and unexpected properties are rejected. Values are bound using
`?` parameters, while SQL identifiers come exclusively from fixed allowlists.
Constraint and database errors reject the helper promise; callers must handle them.

## Platforms and validation

This uses Expo SDK 58's supported async `expo-sqlite` API, not the removed legacy
API: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/.
Metro enables WASM and isolation headers for web development. Production web
hosting must also send `Cross-Origin-Embedder-Policy: credentialless` and
`Cross-Origin-Opener-Policy: same-origin` to support SharedArrayBuffer.
Native persistence should be smoke-tested on a device by creating records,
restarting the app, reading them back, and deleting an event to verify cascade.
Run `node scripts/test-database.cjs` with Node 24+ for SQL and repository checks
using real SQLite through a test adapter (not the Expo native runtime).
Run `node scripts/test-event-form.cjs` for form validation and value conversion checks.
