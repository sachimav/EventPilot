# Offline database

`src/database/index.js` exports the database initializer and repositories.
The root layout waits for initialization before mounting the router. Failures
show a retry button; failed opens close their connection and can be retried.
Event list, create, edit, details, and delete screens use the repositories. Lists
reload whenever their screen regains focus. Task Manager and Budget Manager also
use SQLite and refresh on navigation focus and after successful mutations.

The `eventpilot.db` file persists locally across app restarts. No network or
server is required. WAL mode is enabled, along with foreign keys on every open.

## Schema (version 6)

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

`schema.js` contains ordered, append-only migrations. Initialization reads
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

`src/utils/taskDeadlines.js` provides reusable status, counting, and sorting
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
not count as conflicts. Reusable helpers live in `src/utils/activityConflicts.js`.

Conflicts block saving and display titles, local dates, and time ranges. The user
can keep editing or explicitly choose "Save anyway — allow overlap". Changing any
form field clears the warning/override. Confirmation re-reads SQLite; if the list
or a conflicting activity's title/times changed, it displays the updated warning
and requires confirmation again. Read failures stop saving. Overrides apply only
to the current save and never disable future conflict checks. This is a local
pre-save guard for the timeline editor, not a database uniqueness constraint.
Run `node scripts/test-activity-conflicts.cjs` for overlap, adjacency, date/event
isolation, edit exclusion, and stale-confirmation checks against SQLite records.

## Event Readiness

`src/utils/eventReadiness.js` calculates `completedTasks / totalTasks * 100`
using actual event task records (`completed = 1`), with helpers for one event or
all events in a single pass. Zero tasks returns a null percentage, shown as
**Not Assessed** with an empty progress track. Pending-only events are 0%; only
fully completed task lists show 100%. The formula retains full precision; labels
truncate to one decimal place, while the bar uses the unrounded value.

Event Details displays a readiness card; Home displays readiness on every upcoming
event card. Both read task rows from SQLite and subscribe to successful task
create/update/delete notifications. Reassigning tasks refreshes both events, and
event deletion notifies after cascading task removal. Failed/no-op writes do not
notify. Focused views refresh immediately from SQLite; blurred views unsubscribe
and refresh on return. Query generations prevent stale reads overwriting newer
results. Failed task reads show a retry error rather than a fabricated score.
No derived score is stored and no polling or schema migration is required.
Run `node scripts/test-event-readiness.cjs` for score and SQLite mutation checks;
database tests also verify successful-write-only change notifications.

## Dashboard analytics

Home loads Events, Tasks, and Expenses from SQLite. It shows incomplete task count,
Urgent tasks (due now through exactly 48 hours), Overdue tasks, cross-event task
completion, and the three most pressing tasks. Upcoming event cards include their
individual readiness; no-task events remain Not Assessed. Budget watch flags actual
overspending, estimates over budget, and actual utilization of at least 90%, using
exact integer comparisons. Actual overspending takes precedence, including spending
against zero budgets. Warnings show up to three events, counts, rupee amounts,
utilization bars, and links to the existing event/budget screens.

`dashboardAnalytics.js` reuses task deadline, readiness, and budget utilities.
Monetary analytics are memoized per SQLite refresh; only time-sensitive counts
recompute from the focused screen clock. Successful Event/Task/Expense repository
writes invalidate Home immediately. Navigation focus also reloads SQLite; clock
ticks and app resume update deadline classifications without querying every second.
No chart library, background service, or new schema is needed. Empty datasets show
zero counts, Not Assessed progress, and actionable empty states. Read failures show
retry rather than substitute statistics.
Run `node scripts/test-dashboard-analytics.cjs` for SQLite-backed aggregate checks.

## Extended planning tools (versions 5–6)

Version 5 adds event status/end date/end time, archive and Trash timestamps, Guests,
Vendors, Payments, Receipts, and Reminders. All child records cascade with permanent
event deletion; payments/receipts cascade with their expense. Expense vendor references
become null when the vendor is removed. Version 6 enforces matching vendor/event
relationships on expense inserts and updates. Existing rows receive safe defaults.

Guests have name/contact, RSVP, plus-ones (0–20), dietary requirements and check-in.
Vendors have service/contact, integer quote cents, booking status and notes. Expense
payment history records positive integer cents, date and method; payment totals do
not double-count expense costs. Outstanding balance uses actual cost, falling back to
estimated cost when actual is zero. Overpayments are shown for review. Receipt PNG,
JPEG and PDF files up to 2 MB are stored as data URLs in SQLite and included in backups.

`backups.js` exports a versioned JSON snapshot including archived/deleted records.
Restore validates the format, table fields/IDs, SQLite constraints and foreign keys,
then appends copies with remapped IDs inside a transaction. Any failure rolls back the
entire import. Existing records are preserved. The file-size limit is 10 MB; repeated
imports create duplicates. Original archive/Trash states are preserved on import.

Templates atomically create events with starter tasks and unscheduled activities.
Duplication copies checklist, expense estimates and unscheduled activity plans as a
draft, with no dates, completed tasks, actual costs, guests, vendors or payments.
Events list and global task/expense queries exclude archived/trashed events. Trash
keeps all child data; Data & recovery restores it or permanently deletes it with
confirmation. Explicit completed/cancelled status and scheduled end times govern
upcoming/past filtering. Legacy events without end times retain start-based behavior.

Calendar combines active events, incomplete task deadlines and activities in a month
agenda. Multi-day events appear on every occupied day, clipped to the displayed
month; an end exactly at midnight excludes that following day. Month navigation
supports years 0001 through 9999 and rejects navigation beyond those bounds.
Event editor saves use a conditional SQLite update that rejects records in Trash,
including saves from forms opened before deletion. Restore remains available through
Data & recovery. `.ics` export includes calendar alarms 24 hours before event/activity starts;
events without ends use a one-hour export duration. Calendar apps control delivery.
Reports are escaped printable HTML; CSV exports neutralize spreadsheet formulas.
Reminders persist locally and appear in Reminder Center and on Home when due, only
while the app is open. No background notification service is implemented.

`test-planning-features.cjs` covers new constraints, templates/duplication, payments,
duration/status, escaped exports, backup remapping/rollback, Trash and cascades.
Browser tests additionally cover real RSVP/check-in, vendor linking, payments,
receipt upload, exports, restore, archive recovery, duplication and reminders.

### Event schedule conflicts

Event form creation (including templates) and detail edits check current SQLite
records before saving. The check and write run in one transaction, with event form
writes serialized within the app. Overlaps are blocked and a modal popup lists
conflicting event names and their local date/time ranges. Users can close the popup
to choose another time without losing form entries. There is no override for event overlaps.

The rule is `newStart < existingEnd && newEnd > existingStart`. Explicit end date/time
defines the interval; without an end, the event reserves one hour, matching calendar
exports. Back-to-back events are allowed. Edits exclude their own event ID; cancelled,
archived, trashed, and unscheduled events do not block a slot. Location does not affect
the check. Existing records and backup restore data are preserved; this does not add a
schema migration or retroactively resolve previously saved conflicts.

`test-event-conflicts.cjs` covers interval boundaries, containment, multi-day and
overnight spans, inactive events, and self exclusion. Planning tests cover blocked
creates/updates, rollback and concurrent saves. Browser tests verify the conflict
warning, retained form values, allowed adjacent saves and unchanged rejected edits.
