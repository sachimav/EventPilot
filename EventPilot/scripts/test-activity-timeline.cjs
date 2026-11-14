const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const context = { exports: {}, require: (id) => load(path.resolve(path.dirname(file), `${id}.ts`)) };
  vm.runInNewContext(outputText, context);
  return context.exports;
}
const { migrations } = load(path.join(__dirname, '../src/database/schema.ts'));
const { emptyActivity, validateActivity, toActivityInput, fromActivity, sortActivities, groupActivities, activityTimeRange } = load(path.join(__dirname, '../src/utils/activityTimeline.ts'));
const db = new DatabaseSync(':memory:');
try {
  db.exec('PRAGMA foreign_keys = ON');
  for (const sql of migrations) db.exec(sql);
  db.exec("INSERT INTO Events (name) VALUES ('Wedding'), ('Conference')");
  const errors = validateActivity(emptyActivity);
  for (const key of ['title', 'date', 'startTime', 'endTime']) assert.ok(errors[key]);
  assert.equal(errors.description, undefined);
  const values = { title: ' Welcome ', date: '2026-12-01', startTime: '09:00', endTime: '10:00', description: ' Opening remarks ' };
  assert.equal(Object.keys(validateActivity(values)).length, 0);
  const input = toActivityInput(values, 1);
  assert.equal(input.title, 'Welcome');
  assert.equal(input.notes, 'Opening remarks');
  assert.equal(new Date(input.ends_at).getTime() - new Date(input.starts_at).getTime(), 3600000);
  for (const invalid of [{ title: ' ' }, { date: '2026-02-30' }, { date: '' }, { startTime: '24:00' }, { endTime: '10:60' }, { endTime: '09:00' }, { endTime: '08:59' }, { startTime: '23:00', endTime: '01:00' }]) {
    assert.ok(Object.keys(validateActivity({ ...values, ...invalid })).length);
    assert.throws(() => toActivityInput({ ...values, ...invalid }, 1));
  }
  for (const range of [{ startTime: '00:00', endTime: '00:01' }, { startTime: '23:58', endTime: '23:59' }]) {
    assert.equal(Object.keys(validateActivity({ ...values, ...range })).length, 0);
  }
  assert.equal(Object.keys(validateActivity({ ...values, date: '2028-02-29', description: '' })).length, 0);
  for (const id of [0, -1, 1.5]) assert.throws(() => toActivityInput(values, id));
  const insert = db.prepare('INSERT INTO Activities (event_id, title, notes, starts_at, ends_at) VALUES (?, ?, ?, ?, ?)');
  const add = (changes, eventId = 1) => {
    const row = toActivityInput({ ...values, ...changes }, eventId);
    return Number(insert.run(eventId, row.title, row.notes, row.starts_at, row.ends_at).lastInsertRowid);
  };
  add({ title: 'Later day', date: '2026-12-02', startTime: '08:00', endTime: '08:30' });
  const welcomeId = add({ title: 'Welcome' });
  add({ title: 'Breakfast', startTime: '08:00', endTime: '08:45', description: '' });
  add({ title: 'Same time' });
  add({ title: 'Other event' }, 2);
  db.prepare('INSERT INTO Activities (event_id, title) VALUES (?, ?)').run(1, 'Legacy unscheduled');
  const read = () => db.prepare('SELECT * FROM Activities WHERE event_id = 1 ORDER BY id DESC').all();
  const names = () => sortActivities(read()).map((row) => row.title).join('|');
  assert.equal(names(), 'Breakfast|Welcome|Same time|Later day|Legacy unscheduled');
  const welcome = db.prepare('SELECT * FROM Activities WHERE id = ?').get(welcomeId);
  const form = fromActivity(welcome);
  assert.equal(form.date, values.date);
  assert.equal(form.startTime, values.startTime);
  assert.equal(form.endTime, values.endTime);
  assert.equal(activityTimeRange(welcome), '09:00 — 10:00');
  const groups = groupActivities(read());
  assert.equal(groups.map((group) => group.date).join('|'), '2026-12-01|2026-12-02|unscheduled');
  assert.equal(groups[0].activities.length, 3);
  const original = read();
  const ids = original.map((row) => row.id).join(',');
  sortActivities(original);
  assert.equal(original.map((row) => row.id).join(','), ids);
  const edit = toActivityInput({ ...values, title: 'Setup', startTime: '07:00', endTime: '07:30' }, 1);
  db.prepare('UPDATE Activities SET title = ?, starts_at = ?, ends_at = ? WHERE id = ?').run(edit.title, edit.starts_at, edit.ends_at, welcomeId);
  assert.equal(sortActivities(read())[0].title, 'Setup');
  db.prepare('DELETE FROM Activities WHERE id = ?').run(welcomeId);
  assert.equal(read().some((row) => row.id === welcomeId), false);
  assert.throws(() => insert.run(999, 'Orphan', '', input.starts_at, input.ends_at));
  assert.throws(() => insert.run(1, 'Bad end', '', input.ends_at, input.starts_at));
  db.prepare('DELETE FROM Events WHERE id = ?').run(1);
  assert.equal(read().length, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM Activities WHERE event_id = 2').get().count, 1);
  assert.equal(groupActivities([]).length, 0);
  assert.equal(sortActivities([]).length, 0);
  assert.equal(activityTimeRange({ starts_at: null, ends_at: null }), 'Time not set');
  console.log('Timeline checks passed: required fields, same-day boundaries, local/UTC round trip, chronology, grouping, legacy records, CRUD/event isolation, and cascades.');
} finally { db.close(); }
