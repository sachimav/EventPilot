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
const { filterEvents, eventCategories, defaultEventFilters } = load(path.join(__dirname, '../src/utils/eventFilters.ts'));
const db = new DatabaseSync(':memory:');
try {
  for (const sql of migrations) db.exec(sql);
  const insert = db.prepare('INSERT INTO Events (name, location, category, date, time) VALUES (?, ?, ?, ?, ?)');
  insert.run('Summer Party', 'Colombo Hall', 'Birthday', '2026-12-01', '18:00');
  insert.run('Team Meetup', 'Kandy', 'Conference', '2026-11-14', '10:30');
  insert.run('Yesterday', 'Colombo Garden', ' birthday ', '2026-11-13', '23:59');
  insert.run('Morning Meetup', 'Kandy', 'Conference', '2026-11-14', '10:29');
  insert.run('No date', 'Galle', 'Wedding', null, null);
  insert.run('Date only', 'Galle', 'Wedding', '2026-11-14', null);
  insert.run('100% special_', 'Hall', 'Other', '2026-12-02', '12:00');
  const now = new Date(2026, 10, 14, 10, 30, 20);
  const read = () => db.prepare('SELECT * FROM Events ORDER BY id DESC').all();
  const names = (overrides = {}) => filterEvents(read(), { ...defaultEventFilters, ...overrides }, now).map((row) => row.name).join('|');
  assert.equal(names(), 'Yesterday|Morning Meetup|Team Meetup|Date only|Summer Party|100% special_|No date');
  assert.equal(names({ search: '  MEETUP  ' }), 'Morning Meetup|Team Meetup');
  assert.equal(names({ search: 'COLOMBO' }), 'Yesterday|Summer Party');
  assert.equal(names({ category: 'BIRTHDAY' }), 'Yesterday|Summer Party');
  assert.equal(names({ category: 'birthday', period: 'upcoming', search: 'hall' }), 'Summer Party');
  assert.equal(names({ category: 'birthday', period: 'past', search: 'hall' }), '');
  assert.equal(names({ period: 'upcoming' }), 'Team Meetup|Date only|Summer Party|100% special_');
  assert.equal(names({ period: 'past' }), 'Yesterday|Morning Meetup');
  assert.equal(names({ search: '%' }), '100% special_');
  assert.equal(names({ search: '_' }), '100% special_');
  assert.equal(names({ search: "'); DROP TABLE Events; --" }), '');
  const categories = eventCategories(read());
  assert.equal(categories.length, 4);
  assert.equal(categories.map((item) => item.value).join('|'), 'birthday|conference|other|wedding');
  const rows = read();
  const originalOrder = rows.map((row) => row.id).join(',');
  filterEvents(rows, defaultEventFilters, now);
  assert.equal(rows.map((row) => row.id).join(','), originalOrder);
  // Reloads after CRUD keep filters useful and use the latest saved categories.
  db.prepare('UPDATE Events SET location = ?, category = ? WHERE name = ?').run('Jaffna', 'Festival', 'Summer Party');
  assert.equal(names({ search: 'jaffna', category: 'festival' }), 'Summer Party');
  db.prepare('DELETE FROM Events WHERE name = ?').run('Summer Party');
  assert.equal(names({ search: 'jaffna', category: 'festival' }), '');
  assert.equal(eventCategories(read()).some((item) => item.value === 'festival'), false);
  assert.equal(filterEvents(read(), defaultEventFilters, now).length, 6); // clear filters
  db.exec('DELETE FROM Events');
  assert.equal(filterEvents(read(), defaultEventFilters, now).length, 0);
  assert.equal(eventCategories(read()).length, 0);
  console.log('Event filter checks passed: SQLite data, combined filters, literal search, chronology, time boundaries, categories, CRUD refresh, reset and empty results.');
} finally { db.close(); }
