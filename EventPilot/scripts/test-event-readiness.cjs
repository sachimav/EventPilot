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
const { calculateReadiness, readinessForEvent, readinessByEvent } = load(path.join(__dirname, '../src/utils/eventReadiness.ts'));
assert.equal(calculateReadiness(0, 0).percentage, null);
assert.equal(calculateReadiness(0, 1).percentage, 0);
assert.equal(calculateReadiness(1, 1).percentage, 100);
assert.equal(calculateReadiness(2, 3).percentage, 2 / 3 * 100);
assert.equal(calculateReadiness(9999, 10000).percentage < 100, true);
for (const [complete, total] of [[1, 0], [-1, 2], [1, -1], [2, 1], [0.5, 1], [0, NaN], [0, Infinity]]) {
  assert.throws(() => calculateReadiness(complete, total));
}
const db = new DatabaseSync(':memory:');
try {
  db.exec('PRAGMA foreign_keys = ON');
  for (const sql of migrations) db.exec(sql);
  db.exec("INSERT INTO Events (name) VALUES ('Wedding'), ('Conference'), ('No tasks')");
  const read = () => db.prepare('SELECT * FROM Tasks').all();
  const score = (eventId) => readinessForEvent(eventId, read());
  assert.equal(score(1).percentage, null);
  const insert = db.prepare('INSERT INTO Tasks (event_id, title, completed) VALUES (?, ?, ?)');
  const first = Number(insert.run(1, 'Venue', 0).lastInsertRowid);
  assert.equal(score(1).percentage, 0);
  db.prepare('UPDATE Tasks SET completed = 1 WHERE id = ?').run(first);
  assert.equal(score(1).percentage, 100);
  const second = Number(insert.run(1, 'Catering', 0).lastInsertRowid);
  assert.equal(score(1).percentage, 50);
  assert.equal(score(1).completedTasks, 1);
  assert.equal(score(1).totalTasks, 2);
  insert.run(2, 'Badges', 1);
  assert.equal(score(1).percentage, 50);
  assert.equal(score(2).percentage, 100);
  assert.equal(score(3).percentage, null);
  let all = readinessByEvent(read());
  assert.equal(all.get(1).percentage, 50);
  assert.equal(all.get(2).percentage, 100);
  assert.equal(all.has(3), false);
  db.prepare('UPDATE Tasks SET completed = 0 WHERE id = ?').run(first);
  assert.equal(score(1).percentage, 0);
  db.prepare('UPDATE Tasks SET completed = 1 WHERE id = ?').run(second);
  db.prepare('DELETE FROM Tasks WHERE id = ?').run(first);
  assert.equal(score(1).percentage, 100);
  // Moving a task invalidates both its original event and its new event.
  db.prepare('UPDATE Tasks SET event_id = 2 WHERE id = ?').run(second);
  assert.equal(score(1).percentage, null);
  assert.equal(score(2).totalTasks, 2);
  assert.equal(score(2).percentage, 100);
  db.exec('DELETE FROM Events WHERE id = 2');
  assert.equal(score(2).percentage, null);
  all = readinessByEvent(read());
  assert.equal(all.size, 0);
  console.log('Readiness checks passed: empty/zero/partial/complete scores, exact formula, event isolation, SQLite task mutations/reassignment, grouped Dashboard scores, and cascades.');
} finally { db.close(); }
