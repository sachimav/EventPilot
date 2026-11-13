const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

function load(file) {
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const context = {
    exports: {},
    require: (id) => load(path.resolve(path.dirname(file), `${id}.ts`)),
  };
  vm.runInNewContext(outputText, context);
  return context.exports;
}
const { summarizeEvents } = load(path.join(__dirname, '../src/utils/dashboard.ts'));
const { migrations } = load(path.join(__dirname, '../src/database/schema.ts'));
const db = new DatabaseSync(':memory:');
try {
  for (const sql of migrations) db.exec(sql);
  const now = new Date(2026, 10, 14, 10, 30, 20);
  const snapshot = () => summarizeEvents(db.prepare('SELECT * FROM Events ORDER BY id DESC').all(), now);
  let result = snapshot();
  assert.equal(result.total, 0);
  assert.equal(result.upcoming, 0);
  assert.equal(result.past, 0);
  assert.equal(result.nextEvents.length, 0);
  const insert = db.prepare('INSERT INTO Events (name, date, time) VALUES (?, ?, ?)');
  insert.run('Tomorrow late', '2026-11-15', '18:00');
  insert.run('Yesterday', '2026-11-13', '23:59');
  insert.run('Today earlier', '2026-11-14', '10:29');
  const atNow = Number(insert.run('Starting now', '2026-11-14', '10:30').lastInsertRowid);
  insert.run('Today later', '2026-11-14', '15:00');
  insert.run('Today no time', '2026-11-14', null);
  insert.run('Tomorrow early', '2026-11-15', '09:00');
  insert.run('Next month', '2026-12-01', '09:00');
  insert.run('No date', null, null);
  insert.run('Invalid date', '2026-02-30', '09:00');
  result = snapshot();
  assert.equal(result.total, 10);
  assert.equal(result.upcoming, 6);
  assert.equal(result.past, 2);
  assert.equal(result.unscheduled, 2);
  assert.equal(result.total, result.upcoming + result.past + result.unscheduled);
  assert.equal(result.nextEvents.map((event) => event.name).join('|'), 'Starting now|Today later|Today no time|Tomorrow early|Tomorrow late');
  // Fresh reads reflect edits and deletions, using the same derivation as Home.
  db.prepare('UPDATE Events SET date = ? WHERE id = ?').run('2026-11-01', atNow);
  assert.equal(snapshot().upcoming, 5);
  assert.equal(snapshot().past, 3);
  db.prepare('DELETE FROM Events WHERE id = ?').run(atNow);
  assert.equal(snapshot().total, 9);
  assert.equal(snapshot().past, 2);
  const tomorrow = summarizeEvents(db.prepare('SELECT * FROM Events').all(), new Date(2026, 10, 15, 0, 0));
  assert.equal(tomorrow.past, 4);
  assert.equal(tomorrow.upcoming, 3);
  // Equal times stay deterministic despite the repository's descending ID order.
  db.exec('DELETE FROM Events');
  const first = Number(insert.run('First', '2027-01-01', '12:00').lastInsertRowid);
  insert.run('Second', '2027-01-01', '12:00');
  assert.equal(snapshot().nextEvents[0].id, first);
  db.exec('DELETE FROM Events');
  insert.run('Only past', '2020-01-01', null);
  assert.equal(snapshot().nextEvents.length, 0);
  assert.equal(snapshot().past, 1);
  console.log('Dashboard checks passed: SQLite counts, sorting, five-event limit, time boundaries, unscheduled records, mutations, empty and past-only states.');
} finally { db.close(); }
