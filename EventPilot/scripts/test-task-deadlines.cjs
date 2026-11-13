const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const context = { exports: {}, require: (id) => load(path.resolve(path.dirname(file), `${id}.ts`)) };
  vm.runInNewContext(outputText, context);
  return context.exports;
}
const { getTaskStatus, countTaskStatuses, sortTasksByDeadline, URGENT_WINDOW_MS } = load(path.join(__dirname, '../src/utils/taskDeadlines.ts'));
const { filterTasks, defaultTaskFilters } = load(path.join(__dirname, '../src/utils/taskManager.ts'));
const now = Date.parse('2026-11-14T10:00:00.000+05:30');
const task = (id, delta, completed = 0) => ({ id, event_id: 1, title: `Task ${id}`, notes: '', priority: 'medium', completed,
  due_at: delta === null ? null : new Date(now + delta).toISOString() });

assert.equal(URGENT_WINDOW_MS, 172800000);
assert.equal(getTaskStatus(task(1, -1), now), 'overdue');
assert.equal(getTaskStatus(task(1, 0), now), 'urgent');
assert.equal(getTaskStatus(task(1, 1), now), 'urgent');
assert.equal(getTaskStatus(task(1, URGENT_WINDOW_MS - 1), now), 'urgent');
assert.equal(getTaskStatus(task(1, URGENT_WINDOW_MS), now), 'urgent');
assert.equal(getTaskStatus(task(1, URGENT_WINDOW_MS + 1), now), 'upcoming');
for (const delta of [-1, 0, 1, URGENT_WINDOW_MS + 1, null]) {
  assert.equal(getTaskStatus(task(1, delta, 1), now), 'completed');
}
assert.equal(getTaskStatus(task(1, null), now), 'upcoming');
assert.equal(getTaskStatus({ ...task(1, null), due_at: 'invalid' }, now), 'upcoming');
assert.equal(getTaskStatus({ ...task(1, null, 1), due_at: 'invalid' }, now), 'completed');
const due = task(1, 1000);
assert.equal(getTaskStatus(due, now), 'urgent');
assert.equal(getTaskStatus(due, now + 1001), 'overdue');
const future = task(1, URGENT_WINDOW_MS + 1000);
assert.equal(getTaskStatus(future, now), 'upcoming');
assert.equal(getTaskStatus(future, now + 1000), 'urgent');
// The stored offset and device timezone must not change an instant's status.
for (const deadline of ['2026-11-14T10:00:00+05:30', '2026-11-14T04:30:00Z', '2026-11-13T23:30:00-05:00']) {
  assert.equal(getTaskStatus({ ...task(1, null), due_at: deadline }, now), 'urgent');
}
// A 48-hour window means elapsed hours, including when DST changes local clocks.
const dstNow = Date.parse('2026-03-07T12:00:00-05:00');
assert.equal(getTaskStatus({ ...task(1, null), due_at: '2026-03-09T13:00:00-04:00' }, dstNow), 'urgent');
assert.equal(getTaskStatus({ ...task(1, null), due_at: '2026-03-09T13:00:00.001-04:00' }, dstNow), 'upcoming');

const rows = [task(9, null), task(8, -99999, 1), task(7, URGENT_WINDOW_MS + 1), task(6, 20), task(5, -1), task(4, -100),
  task(3, 20), { ...task(2, null), due_at: 'invalid' }, task(1, null, 1)];
const original = rows.map((row) => row.id).join(',');
assert.equal(sortTasksByDeadline(rows, now).map((row) => row.id).join(','), '4,5,3,6,7,2,9,8,1');
assert.equal(rows.map((row) => row.id).join(','), original);
const counts = countTaskStatuses(rows, now);
assert.equal(counts.overdue, 2);
assert.equal(counts.urgent, 2);
assert.equal(counts.upcoming, 3);
assert.equal(counts.completed, 2);
assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), rows.length);
assert.equal(Object.values(countTaskStatuses([], now)).reduce((a, b) => a + b, 0), 0);
assert.equal(sortTasksByDeadline([], now).length, 0);
const ids = (status) => filterTasks(rows, { ...defaultTaskFilters, status }, now).map((row) => row.id).join(',');
assert.equal(ids('overdue'), '4,5');
assert.equal(ids('urgent'), '3,6');
assert.equal(ids('upcoming'), '7,2,9');
assert.equal(ids('completed'), '8,1');
assert.equal(ids('pending'), '4,5,3,6,7,2,9');
assert.equal(filterTasks(rows, { event: '999', priority: 'all', status: 'urgent' }, now).length, 0);
console.log('Deadline checks passed: exact deadline, ±1ms at 48h, completion override, missing/invalid deadlines, offsets/DST, clock transitions, sorting, counts, and filters.');
