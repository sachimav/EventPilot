# EventPilot test report

## Fix verification ? 15 November 2026

All three issues documented in the original audit below are now fixed.

- Trashed-event edit links require restoration; conditional SQLite updates also reject saves from editors opened before deletion.
- Calendar shows multi-day events on each occupied day, including month/year crossings. Midnight ends exclude the following day, and expansion is limited to the displayed month.
- Calendar rejects year zero and prevents month navigation outside years 0001?9999.
- Verification passed: 14 logic/database scripts, all 5 browser workflows (including two new regression workflows), JavaScript project validation, lint, web build, and diff whitespace checks.
- Database schema and existing records were preserved. Physical Android/iOS testing remains outside this verification.

The remainder is the historical audit record, with pre-fix reproduction steps and source line references.

Test date: 15 November 2026 (Asia/Colombo)

## Scope and result

The current JavaScript application was tested using a fresh web export, Microsoft Edge, isolated browser profiles, and SQLite-backed workflows. Test records did not use the user's existing browser storage. No application source files were changed during this audit.

**Result: existing automated checks pass; three additional bugs were reproduced.** Passing the existing suite does not establish that every possible input or device configuration is bug-free.

## Checks completed

| Check | Result |
| --- | --- |
| JavaScript project validation: npm run typecheck | Passed; configuration/syntax validation, not TypeScript type enforcement |
| ESLint: npm run lint | Passed |
| Web export: npm run build:web | Passed |
| Database/logic scripts | All 13 passed |
| Existing Playwright workflows | All 3 passed, approximately 44 seconds |
| Tab label bounds | Passed at 320, 390, 430, and 1280 CSS-pixel viewport widths |
| Additional browser edge cases | Three bugs reproduced below |

The logic scripts cover database migrations, foreign keys and cascades, parameterized CRUD, event forms/filtering/statistics, task forms/deadline boundaries/readiness, financial calculations, activity validation/conflicts, and planning/backup functionality.

The existing browser workflows cover:

- Event validation and creation, navigation to workspaces, and local persistence.
- Tasks, completion/readiness, expenses, activities, and conflict confirmation.
- Recovery when an event is deleted while a task is being edited.
- Event templates and duration fields.
- Guest RSVP, plus-ones, check-in and editing; vendor creation and expense linking.
- Payment records, receipt upload, report/calendar downloads.
- Backup export/import, archive/restore, duplication, reminders, and calendar filtering.

Additional checks used the Asia/Colombo browser timezone. No uncaught JavaScript exceptions were recorded during the completed multi-day/calendar/Trash reproduction scenario.

## Confirmed bugs

### 1. Trashed events remain editable through their edit URL

**Priority: Medium — inconsistent recovery and data handling.**

Steps:

1. Create an event and note its details URL, for example `/events/1`.
2. Delete the event and confirm; it moves to Trash.
3. Open its previous edit URL, for example `/events/1/edit`.
4. Change the title and save.
5. Open Data & recovery.

Observed: the edit form opens, the save succeeds, and the changed title appears on the record in Trash. The normal event details screen correctly refuses to show the same deleted event.

Expected: an event in Trash should require restoration before editing. An old edit link should display an unavailable/restore message. Saving from an editor opened before deletion should also recheck the event's current state.

Cause: `src/components/EventEditor.js:20` accepts the raw record; the guard at line 36 checks only whether the record exists, and the update at line 39 does not check `deleted_at`.

Evidence: `.expo/screenshots/audit-trash-edit.png` and browser reproduction output confirming one editable form and one persisted modified Trash record.

### 2. Multi-day events disappear from the calendar after their first day

**Priority: Medium — calendar can incorrectly look free during an ongoing event.**

Steps:

1. Create an event starting 20 December 2026 at 09:00 and ending 22 December 2026 at 18:00.
2. Open Calendar and enter `2026-12`.
3. Inspect or select 20, 21, and 22 December.

Observed: 20 December shows one scheduled item; 21 and 22 December show zero. Selecting 21 December displays the empty-calendar message and omits the event.

Expected: show the event on each day it occupies, or provide an explicit spanning-event representation so ongoing events remain visible.

Cause: `src/utils/eventExports.js:66` constructs a single agenda row using only `event.date`; the calendar's day filtering in `src/components/PlanningCalendar.js:26` matches that one date. The optional event end date/time is not considered.

Evidence: `.expo/screenshots/audit-multiday-calendar.png` and browser output showing counts of 1, 0, and 0 for the three dates.

### 3. Calendar accepts year zero and generates an invalid month

**Priority: Low — invalid-input handling.**

Steps:

1. Open Calendar.
2. Enter `0000-01` in Month (YYYY-MM).
3. Press Previous month.

Observed: there is no initial validation warning; the month changes to the malformed value `-1-12-1`.

Expected: reject unsupported years and prevent month navigation from generating values outside the supported range. Month validity should include actual date/year validation, not only the field's text shape.

Cause: `src/components/PlanningCalendar.js:23` accepts any four-digit year, including zero. The date arithmetic at line 30 then crosses into a negative year, which the date formatter does not represent as YYYY-MM.

## Recommended order

1. Guard deleted-event edit loading and saves.
2. Represent multi-day event occupancy in calendar agenda/grid calculations.
3. Validate calendar year bounds and month navigation.
4. Add regression tests for all three scenarios before changing their implementations.

## Limits of this audit

- This is web/browser testing, including mobile-sized viewports; it is not a test on physical Android/iOS devices or native builds.
- Native date/time picker behavior, keyboard/safe-area behavior on real phones, native sharing, and device-specific lifecycle behavior remain unverified.
- Not every edit/delete permutation, corrupted-database scenario, accessibility interaction, or large-data performance case was exercised.
- Account/cloud features, ticket payments, and closed-app notification delivery are not implemented features and were not treated as test failures.
- An uncached offline web launch is not guaranteed by local SQLite persistence; the project already documents that limitation.

The audit's temporary browser reproduction script is `.expo/audit-features.cjs` (ignored local test artifact). Application logic and the database schema were left unchanged.
