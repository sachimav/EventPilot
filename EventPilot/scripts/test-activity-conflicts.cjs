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
const { findActivityConflicts, sameActivityConflicts } = load(path.join(__dirname, '../src/utils/activityConflicts.ts'));
const db = new DatabaseSync(':memory:');
try {
  db.exec('PRAGMA foreign_keys = ON');
  for (const sql of migrations) db.exec(sql);
  db.exec("INSERT INTO Events (name) VALUES ('Wedding'), ('Conference')");
  const insert = db.prepare('INSERT INTO Activities (event_id, title, starts_at, ends_at) VALUES (?, ?, ?, ?)');
  const existingId = Number(insert.run(1, 'Ceremony', '2026-12-01T09:00:00.000Z', '2026-12-01T10:00:00.000Z').lastInsertRowid);
  const candidate = (start, end, date = '2026-12-01', eventId = 1) => ({ event_id: eventId, title: 'New activity', starts_at: `${date}T${start}:00.000Z`, ends_at: `${date}T${end}:00.000Z` });
  const rows = () => db.prepare('SELECT * FROM Activities ORDER BY id DESC').all();
  const conflicts = (start, end, date, eventId, excludeId) => findActivityConflicts(candidate(start, end, date, eventId), rows(), excludeId);
  // Partial intersections, containment in both directions, and exact intervals overlap.
  for (const [start, end] of [['08:30', '09:30'], ['09:30', '10:30'], ['09:15', '09:45'], ['08:00', '11:00'], ['09:00', '10:00']]) {
    assert.equal(conflicts(start, end).map((row) => row.id).join(','), String(existingId));
  }
  // Touching endpoints is safe in either direction; a real gap is safe too.
  for (const [start, end] of [['08:00', '09:00'], ['10:00', '11:00'], ['06:00', '07:00'], ['12:00', '13:00']]) {
    assert.equal(conflicts(start, end).length, 0);
  }
  assert.equal(conflicts('09:00', '10:00', '2026-12-02').length, 0);
  assert.equal(conflicts('09:00', '10:00', '2026-12-01', 2).length, 0);
  assert.equal(conflicts('09:00', '10:00', '2026-12-01', 1, existingId).length, 0);
  const secondId = Number(insert.run(1, 'Photos', '2026-12-01T09:30:00.000Z', '2026-12-01T10:30:00.000Z').lastInsertRowid);
  assert.equal(conflicts('09:00', '10:00', '2026-12-01', 1, existingId).map((row) => row.id).join(','), String(secondId));
  const shown = conflicts('09:00', '10:00');
  assert.equal(shown.map((row) => row.title).join('|'), 'Ceremony|Photos');
  assert.equal(sameActivityConflicts(shown, [...shown].reverse()), true);
  assert.equal(sameActivityConflicts(shown, []), false);
  // Re-read detects newly added, moved, renamed, or deleted conflicts before override.
  const thirdId = Number(insert.run(1, 'Guests arrive', '2026-12-01T09:45:00.000Z', '2026-12-01T10:15:00.000Z').lastInsertRowid);
  assert.equal(sameActivityConflicts(conflicts('09:00', '10:00'), shown), false);
  db.prepare('DELETE FROM Activities WHERE id = ?').run(thirdId);
  assert.equal(sameActivityConflicts(conflicts('09:00', '10:00'), shown), true);
  db.prepare('UPDATE Activities SET title = ? WHERE id = ?').run('Updated photos', secondId);
  assert.equal(sameActivityConflicts(conflicts('09:00', '10:00'), shown), false);
  db.prepare('UPDATE Activities SET title = ?, ends_at = ? WHERE id = ?').run('Photos', '2026-12-01T10:45:00.000Z', secondId);
  assert.equal(sameActivityConflicts(conflicts('09:00', '10:00'), shown), false);
  // Equivalent instants with offsets must be detected, and adjacent milliseconds stay safe.
  const offset = { ...candidate('09:00', '10:00'), starts_at: '2026-12-01T14:30:00+05:30', ends_at: '2026-12-01T15:30:00+05:30' };
  assert.equal(findActivityConflicts(offset, rows()).length, 2);
  const oneMs = { ...candidate('09:00', '10:00'), starts_at: '2026-12-01T08:59:59.999Z', ends_at: '2026-12-01T09:00:00.001Z' };
  assert.equal(findActivityConflicts(oneMs, rows()).length, 1);
  const before = rows().map((row) => row.id).join(',');
  findActivityConflicts(candidate('09:00', '10:00'), rows());
  assert.equal(rows().map((row) => row.id).join(','), before);
  for (const invalid of [{ starts_at: null }, { ends_at: null }, { starts_at: 'bad' }, { ends_at: '2026-12-01T08:00:00Z' }, { ends_at: '2026-12-01T09:00:00Z' }]) {
    assert.throws(() => findActivityConflicts({ ...candidate('09:00', '10:00'), ...invalid }, rows()));
  }
  db.exec('DELETE FROM Activities');
  insert.run(1, 'Unscheduled', null, null);
  insert.run(1, 'Invalid legacy', 'bad', 'bad');
  insert.run(1, 'Zero length legacy', '2026-12-01T09:00:00Z', '2026-12-01T09:00:00Z');
  assert.equal(conflicts('09:00', '10:00').length, 0);
  insert.run(1, 'Cross midnight legacy', '2026-12-01T23:00:00Z', '2026-12-02T02:00:00Z');
  assert.equal(conflicts('01:00', '03:00', '2026-12-02').length, 1);
  assert.equal(findActivityConflicts(candidate('09:00', '10:00'), []).length, 0);
  console.log('Conflict checks passed: partial/full overlaps, adjacency, gaps, date/event isolation, self exclusion, latest SQLite changes, override snapshots, offsets, and legacy data.');
} finally { db.close(); }
