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
const { emptyTask, validateTask, toTaskInput, fromTask, filterTasks, defaultTaskFilters } = load(path.join(__dirname, '../src/utils/taskManager.ts'));
const db = new DatabaseSync(':memory:');
try {
  db.exec('PRAGMA foreign_keys = ON');
  for (const sql of migrations) db.exec(sql);
  db.exec("INSERT INTO Events (name) VALUES ('Wedding'), ('Conference')");
  const events = db.prepare('SELECT * FROM Events').all();
  const errors = validateTask(emptyTask, events);
  for (const key of ['eventId', 'title', 'date', 'time']) assert.ok(errors[key]);
  assert.equal(errors.description, undefined);
  const values = { ...emptyTask, eventId: String(events[0].id), title: ' Book venue ', description: ' Phone venue ', date: '2026-12-01', time: '15:45', priority: 'high' };
  assert.equal(Object.keys(validateTask(values, events)).length, 0);
  for (const change of [{ title: ' ' }, { eventId: '999' }, { date: '2026-02-30' }, { time: '24:00' }, { priority: 'urgent' }, { completed: 1 }]) {
    assert.ok(Object.keys(validateTask({ ...values, ...change }, events)).length);
    assert.throws(() => toTaskInput({ ...values, ...change }, events));
  }
  const input = toTaskInput(values, events);
  assert.equal(input.title, 'Book venue');
  assert.equal(input.notes, 'Phone venue');
  const insert = db.prepare('INSERT INTO Tasks (event_id, title, notes, due_at, priority, completed) VALUES (?, ?, ?, ?, ?, ?)');
  insert.run(input.event_id, input.title, input.notes, input.due_at, input.priority, input.completed);
  insert.run(events[1].id, 'Print badges', '', '2026-11-01T12:00:00.000Z', 'low', 0);
  insert.run(events[0].id, 'Send invitations', '', '2026-10-01T12:00:00.000Z', 'medium', 1);
  const read = () => db.prepare('SELECT * FROM Tasks').all();
  const task = read()[0];
  const restored = fromTask(task);
  assert.equal(restored.date, values.date);
  assert.equal(restored.time, values.time);
  assert.equal(restored.priority, 'high');
  assert.equal(restored.completed, false);
  const names = (filters = {}) => filterTasks(read(), { ...defaultTaskFilters, ...filters }).map((row) => row.title).join('|');
  assert.equal(names(), 'Print badges|Book venue|Send invitations');
  assert.equal(names({ event: String(events[0].id), priority: 'high', status: 'pending' }), 'Book venue');
  assert.equal(names({ status: 'completed' }), 'Send invitations');
  assert.equal(names({ event: String(events[1].id), priority: 'high' }), '');
  db.prepare('UPDATE Tasks SET completed = 1 WHERE id = ?').run(task.id);
  assert.equal(names({ priority: 'high', status: 'pending' }), '');
  assert.equal(names({ priority: 'high', status: 'completed' }), 'Book venue');
  db.prepare('UPDATE Tasks SET completed = 0 WHERE id = ?').run(task.id);
  assert.equal(names({ priority: 'high', status: 'pending' }), 'Book venue');
  db.prepare('DELETE FROM Tasks WHERE id = ?').run(task.id);
  assert.equal(names({ priority: 'high' }), '');
  db.prepare('DELETE FROM Events WHERE id = ?').run(events[0].id);
  assert.equal(names(), 'Print badges');
  db.exec('DELETE FROM Events');
  assert.equal(read().length, 0);
  assert.equal(filterTasks([], defaultTaskFilters).length, 0);
  console.log('Task Manager checks passed: required fields, local/UTC deadlines, priority, combined filters, completion/reopen, deletion, and event cascade.');
} finally { db.close(); }
