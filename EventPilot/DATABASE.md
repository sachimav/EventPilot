# Offline database

`src/database/index.ts` exports the database initializer and typed repositories.
The root layout waits for initialization before mounting the router. Failures
show a retry button; failed opens close their connection and can be retried.
Event list, create, edit, details, and delete screens use the repositories. Lists
reload whenever their screen regains focus. Task Manager and Budget Manager also
use SQLite and refresh on navigation focus and after successful mutations.

The `eventpilot.db` file persists locally across app restarts. No network or
server is required. WAL mode is enabled, along with foreign keys on every open.

## Schema (version 4)

All four tables have an auto-incrementing integer `id` primary key and UTC
`created_at` / `updated_at` timestamps. Repository updates refresh `updated_at`.

| Table | Fields |
| --- | --- |
| Events | Required `name`; optional `date`, `time`; `category` (default `Other`); `location`, `notes`; nonnegative integer `budget_cents`; three-character `currency` (default `LKR`) |
| Tasks | Required `event_id`, `title`; `notes`, optional `due_at`; `priority` as low/medium/high (default medium); `completed` as SQLite integer 0 or 1 |
| Expenses | Required `event_id`, `title`, nonnegative integer `amount_cents` (actual); nonnegative integer `estimated_cents`; `category`, `notes`, optional `incurred_at` |
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

## Home dashboard

Home reads the events repository on each navigation focus. The same SQLite read
drives all statistics and the five nearest upcoming event cards. Past events have
a scheduled start before the current local minute; there is no manual completion
status. An event starting in the current minute is upcoming. Date-only legacy
events remain upcoming through their scheduled day. Missing/invalid dates count
toward the total and are flagged separately, rather than classified as past.
Upcoming cards sort by local date/time ascending, then by ID for equal starts.
Run `node scripts/test-dashboard.cjs` for SQLite-backed dashboard checks.

## My events search and filters

My events loads SQLite rows on navigation focus and filters that local snapshot
without network access. Search matches literal, case-insensitive substrings in
titles or locations. Search, category, and upcoming/past conditions combine.
Categories come from saved records, with whitespace/case variants grouped together.
Results sort by scheduled start ascending, then ID, with undated records last in
All events. Upcoming/past use the same scheduling rules as Home. Clear filters
resets search, category, and period together. Filters stay selected when returning
from event details or edits; the underlying SQLite data is refreshed.
Run `node scripts/test-event-filters.cjs` for SQLite-backed filtering checks.

## Task Manager

Tasks support create, inline edit, details, delete confirmation, completion and
reopening. The form requires an existing event, title, deadline date/time, and
priority (default Medium). Description maps to `notes` and is optional. Deadline
pickers use local time; `due_at` stores a UTC ISO timestamp and displays locally.
Existing tasks without deadlines remain visible and can be completed or deleted;
editing asks the user to provide a deadline. Version 3 preserves existing tasks
and gives them Medium priority, enforced by a SQLite CHECK constraint.

Event, priority, and completion filters combine locally on SQLite records.
Pending tasks sort first, then by deadline, with unset deadlines last in each
status. Lists reload on navigation focus and after successful mutations. Failed
saves retain form entries, and failed completion/deletion actions show errors.
Deleting a parent event cascades to its tasks. No network connection is needed.
Run `node scripts/test-task-manager.cjs` for form and filtering checks; the database
checks also cover priority constraints, migration, and persistence after reopening.

## Smart task deadlines

`src/utils/taskDeadlines.ts` provides reusable status, counting, and sorting
functions. All accept an explicit current timestamp for deterministic tests.
Completed takes precedence. Incomplete tasks are Overdue if their deadline is
strictly before now; Urgent if due now through exactly 48 elapsed hours from now;
and Upcoming otherwise. Missing/invalid legacy deadlines are Upcoming and display
"No deadline set". Stored UTC timestamps and offset timestamps are compared as
instants against the device clock, without date-only rounding or UTC/local shifts.

Task Manager displays colored, labeled badges and four status counts. Counts honor
event and priority selections, while ignoring the status filter so every bucket
remains visible. Status filters include Overdue, Urgent, Upcoming, Completed, and
the existing Pending filter (all incomplete tasks). Sorting puts Overdue first,
then Urgent, Upcoming, and Completed, with earliest deadlines first per group,
missing/invalid deadlines last, and ID as a stable tie-breaker.

One screen clock refreshes each second while focused and active, and immediately
on navigation focus or app resume. It does not poll SQLite or store derived status.
An unsaved editor remains mounted if its task stops matching a live status filter.
No notifications service or backend is involved.
Run `node scripts/test-task-deadlines.cjs` for boundary, timezone/DST, counting,
filtering, and ordering checks.

## Budget Manager

Select an event to create, edit, or delete its expenses. Every form requires
category, description, estimated amount, and actual amount. Zero amounts are valid;
negative, blank, nonnumeric, overly large, or more-than-two-decimal amounts are
rejected. Enter bare rupee amounts (e.g. `1234.50`), without separators or symbols.
Description maps to the existing `title` field, actual to `amount_cents`, and
estimated to `estimated_cents`. Existing notes are preserved and displayed.

Version 4 adds `estimated_cents` with a nonnegative integer CHECK constraint and
backfills existing expenses with their recorded actual amount as the estimate.
No existing expense is deleted or reset. Category and event totals derive from
the selected event's SQLite expenses. Case and surrounding whitespace variations
in category names are grouped together; legacy empty categories are Uncategorized.
All Budget Manager amounts are LKR, displayed as `Rs. 1,234.50`. Totals use BigInt
minor units to avoid rounding even when their sum exceeds JS safe integer range.

Deletion requires confirmation. Failed saves preserve entries, database errors
offer retry, and event selection is locked while editing to protect the form.
Deleting an event cascades to its expenses. All operations work offline.
Run `node scripts/test-budget-manager.cjs` for amount, category totals, isolation,
edit/delete, and constraint checks. Database tests also verify persistence after
reopening and non-destructive migration of legacy expenses.

### Financial summaries

`summarizeBudget` combines the event's stored `budget_cents` with its SQLite
expense rows. Remaining budget is event budget minus actual expenses; negative
balances and estimated/actual overspending are highlighted. Utilization is actual
expenses divided by budget, rounded to two decimal places. The numeric percentage
may exceed 100%, while the accessible progress bar is capped at 100%. For zero
budgets, utilization is unavailable and the bar is empty; positive spending still
shows an overspending warning. No expenses produce zero totals and full remaining
budget. "Edit event budget" uses the existing event editor and refreshes on return.

Category comparisons show estimated/actual totals, the difference from the estimate,
and paired bars sharing a common maximum across all categories. Calculations use
integer/BigInt cents; display-only percentages use numbers. Summaries are memoized
and layouts wrap for narrow screens. Run `node scripts/test-budget-summary.cjs`
for SQLite-backed financial summary and edge-case checks.

## Event Timeline

The event details Timeline link opens a schedule for that event. Activities support
add, inline edit, and confirmed delete using the existing Activities repository.
The form requires a title, date, start time, and end time; description is optional
and maps to `notes`. Start/end use the same local date, with end strictly after
start (equal times and overnight ranges are rejected). Nonexistent local times
are rejected instead of silently shifting the schedule. Overlap requires explicit
confirmation as described below.

Date/time inputs convert to UTC ISO `starts_at` / `ends_at`, which already carry
the activity date, so no schema migration is needed. The timeline sorts by start
instant then ID, groups by local calendar date, and displays local time ranges.
Legacy activities without a valid start remain visible under Needs scheduling,
where editing supplies the required date/time fields. Existing locations are
preserved and displayed. New activities default to the event date when available.

Schedules reload on navigation focus and after successful changes. Failed saves
retain form entries; failed reads/deletes have retry handling. Missing events and
events with no activities have separate empty states. Foreign keys prevent orphan
activities and cascade deletion when their event is removed. Everything is local.
Run `node scripts/test-activity-timeline.cjs` for SQLite-backed validation, ordering,
grouping, CRUD, and cascade checks; database tests verify persistence after reopen.

### Schedule conflicts

Every create/edit save reads the latest event activities from SQLite and checks
`newStart < existingEnd && newEnd > existingStart`. Adjacent intervals are allowed.
Comparison uses timestamps including the date; only the same event is checked and
the edited activity's ID is excluded. Invalid or unscheduled legacy intervals do
not count as conflicts. Reusable helpers live in `src/utils/activityConflicts.ts`.

Conflicts block saving and display titles, local dates, and time ranges. The user
can keep editing or explicitly choose "Save anyway — allow overlap". Changing any
form field clears the warning/override. Confirmation re-reads SQLite; if the list
or a conflicting activity's title/times changed, it displays the updated warning
and requires confirmation again. Read failures stop saving. Overrides apply only
to the current save and never disable future conflict checks. This is a local
pre-save guard for the timeline editor, not a database uniqueness constraint.
Run `node scripts/test-activity-conflicts.cjs` for overlap, adjacency, date/event
isolation, edit exclusion, and stale-confirmation checks against SQLite records.
