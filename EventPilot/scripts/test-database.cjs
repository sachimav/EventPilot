// Node SQLite exercises real SQL; the adapter substitutes only Expo's native bridge.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const vm = require('node:vm');

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'eventpilot-db-'));
const filename = path.join(folder, 'test.db');
let connection;
let opens = 0;
function loadModules() {
  const cache = {};
  function load(name) {
    if (cache[name]) return cache[name].exports;
    const module = { exports: {} };
    cache[name] = module;
    const source = fs.readFileSync(path.join(__dirname, '../src/database', `${name}.ts`), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
    vm.runInNewContext(outputText, {
      exports: module.exports,
      require(id) {
        if (id === 'expo-sqlite') return { async openDatabaseAsync() {
          opens += 1;
          connection = new DatabaseSync(filename);
          return {
            async execAsync(sql) { connection.exec(sql); },
            async runAsync(sql, values = []) {
              const result = connection.prepare(sql).run(...values);
              return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
            },
            async getFirstAsync(sql, values = []) { return connection.prepare(sql).get(...values) ?? null; },
            async getAllAsync(sql, values = []) { return connection.prepare(sql).all(...values); },
            async withTransactionAsync(callback) {
              connection.exec('BEGIN');
              try { await callback(); connection.exec('COMMIT'); }
              catch (error) { connection.exec('ROLLBACK'); throw error; }
            },
            async closeAsync() { connection.close(); },
          };
        } };
        return load(id.replace('./', ''));
      },
    });
    return module.exports;
  }
  return load('index');
}

(async () => {
  let api = loadModules();
  await Promise.all([api.initializeDatabase(), api.initializeDatabase()]);
  assert.equal(opens, 1);
  assert.equal(connection.prepare('PRAGMA user_version').get().user_version, api.SCHEMA_VERSION);
  const { events, tasks, expenses, activities } = api;
  const name = "Party'); DROP TABLE Events; --";
  const id = await events.create({ name, notes: 'Description', category: 'Conference', date: '2026-12-01', time: '18:30', location: 'Colombo', budget_cents: 12345 });
  assert.equal((await events.getById(id)).name, name);
  assert.equal((await events.getById(id)).category, 'Conference');
  assert.equal((await events.getById(id)).time, '18:30');
  assert.equal((await events.list()).length, 1);
  const taskId = await tasks.create({ event_id: id, title: 'Book venue', notes: 'Call the venue', due_at: '2026-12-01T10:00:00.000Z', priority: 'high' });
  assert.equal((await tasks.getById(taskId)).priority, 'high');
  assert.equal((await tasks.getById(taskId)).completed, 0);
  assert.equal(await tasks.update(taskId, { completed: 1, notes: 'Booked' }), true);
  assert.equal((await tasks.list()).length, 1);
  await assert.rejects(tasks.update(taskId, { priority: 'urgent' }));
  for (const repo of [tasks, expenses, activities]) {
    const extra = repo === expenses ? { amount_cents: 123 } : {};
    const child = await repo.create({ event_id: id, title: 'Original', ...extra });
    assert.equal(await repo.update(child, { title: 'Updated' }), true);
    assert.equal((await repo.getById(child)).title, 'Updated');
    assert.equal((await repo.listByEvent(id)).length, repo === tasks ? 2 : 1);
    assert.equal(await repo.delete(child), true);
    assert.equal(await repo.getById(child), null);
    await repo.create({ event_id: id, title: 'Cascade me', ...extra });
    await assert.rejects(repo.create({ event_id: 99999, title: 'Orphan', ...extra }));
  }
  const expenseId = await expenses.create({ event_id: id, title: 'Venue deposit', category: 'Venue', estimated_cents: 50000, amount_cents: 25000 });
  const activityId = await activities.create({ event_id: id, title: 'Welcome', notes: 'Opening remarks', starts_at: '2026-12-01T03:30:00.000Z', ends_at: '2026-12-01T04:30:00.000Z' });
  assert.equal(await activities.update(activityId, { title: 'Opening', ends_at: '2026-12-01T05:00:00.000Z' }), true);
  assert.equal((await expenses.getById(expenseId)).estimated_cents, 50000);
  assert.equal(await expenses.update(expenseId, { estimated_cents: 60000, amount_cents: 30000, category: 'Hall' }), true);
  await assert.rejects(expenses.update(expenseId, { estimated_cents: -1 }));
  await assert.rejects(expenses.update(expenseId, { amount_cents: -1 }));
  await assert.rejects(expenses.update(expenseId, { estimated_cents: 1.5 }));
  await assert.rejects(events.create({ name: ' ' }));
  await assert.rejects(events.update(id, { budget_cents: -1 }));
  await assert.rejects(expenses.create({ event_id: id, title: 'Bad', amount_cents: 1.5 }));
  await assert.rejects(tasks.create({ event_id: id, title: 'Bad', completed: 2 }));
  await assert.rejects(activities.create({ event_id: id, title: 'Bad', starts_at: '2026-12-02', ends_at: '2026-12-01' }));
  await assert.rejects(events.update(id, { 'name = ?; DROP TABLE Events; --': 'Bad' }));
  await assert.rejects(events.update(id, {}));
  await assert.rejects(events.getById(-1));
  assert.equal(await events.update(id, { notes: 'Saved' }), true);
  connection.close();
  api = loadModules();
  assert.equal((await api.events.getById(id)).notes, 'Saved');
  assert.equal((await api.events.getById(id)).budget_cents, 12345);
  assert.equal((await api.expenses.getById(expenseId)).estimated_cents, 60000);
  assert.equal((await api.expenses.getById(expenseId)).amount_cents, 30000);
  assert.equal((await api.expenses.getById(expenseId)).category, 'Hall');
  assert.equal((await api.activities.getById(activityId)).title, 'Opening');
  assert.equal((await api.activities.getById(activityId)).notes, 'Opening remarks');
  assert.equal((await api.activities.getById(activityId)).starts_at, '2026-12-01T03:30:00.000Z');
  assert.equal((await api.activities.getById(activityId)).ends_at, '2026-12-01T05:00:00.000Z');
  assert.equal((await api.tasks.getById(taskId)).completed, 1);
  assert.equal((await api.tasks.getById(taskId)).notes, 'Booked');
  assert.equal((await api.tasks.getById(taskId)).priority, 'high');
  assert.equal((await api.tasks.getById(taskId)).due_at, '2026-12-01T10:00:00.000Z');
  await api.events.update(id, { category: 'Birthday', time: '19:45' });
  assert.equal((await api.events.getById(id)).category, 'Birthday');
  assert.equal((await api.events.getById(id)).time, '19:45');
  assert.equal(await api.events.delete(id), true);
  for (const repo of [api.tasks, api.expenses, api.activities]) assert.equal((await repo.listByEvent(id)).length, 0);
  assert.equal(await api.events.delete(id), false);
  // A conflicting fresh schema must roll back earlier DDL and user_version.
  connection.exec('DROP TABLE Activities; DROP TABLE Expenses; DROP TABLE Tasks; DROP TABLE Events; CREATE TABLE Tasks (id INTEGER); PRAGMA user_version = 0;');
  connection.close();
  api = loadModules();
  await assert.rejects(api.initializeDatabase());
  const repair = new DatabaseSync(filename);
  assert.equal(repair.prepare('PRAGMA user_version').get().user_version, 0);
  assert.equal(repair.prepare("SELECT name FROM sqlite_master WHERE name = 'Events'").get(), undefined);
  repair.exec('DROP TABLE Tasks');
  repair.close();
  await api.initializeDatabase(); // retry after failure
  connection.exec('PRAGMA user_version = 999');
  connection.close();
  api = loadModules();
  await assert.rejects(api.initializeDatabase(), /newer version/);
  // Simulate an existing v1 installation and verify its records survive upgrade.
  const old = new DatabaseSync(filename);
  old.exec('PRAGMA user_version = 1; ALTER TABLE Events DROP COLUMN category; ALTER TABLE Events DROP COLUMN time; DROP INDEX tasks_due_at; ALTER TABLE Tasks DROP COLUMN priority; ALTER TABLE Expenses DROP COLUMN estimated_cents;');
  old.prepare('INSERT INTO Events (name, notes, budget_cents) VALUES (?, ?, ?)').run('Legacy event', 'Keep me', 999);
  old.exec("INSERT INTO Tasks (event_id, title, completed) SELECT id, 'Legacy task', 1 FROM Events LIMIT 1");
  old.exec("INSERT INTO Expenses (event_id, title, amount_cents, category) SELECT id, 'Legacy expense', 456, 'Venue' FROM Events LIMIT 1");
  old.close();
  api = loadModules();
  const legacy = (await api.events.list())[0];
  assert.equal(legacy.name, 'Legacy event');
  assert.equal(legacy.notes, 'Keep me');
  assert.equal(legacy.budget_cents, 999);
  assert.equal(legacy.category, 'Other');
  assert.equal(legacy.time, null);
  assert.equal((await api.tasks.list())[0].priority, 'medium');
  assert.equal((await api.tasks.list())[0].completed, 1);
  assert.equal((await api.expenses.list())[0].estimated_cents, 456);
  assert.equal((await api.expenses.list())[0].amount_cents, 456);
  console.log('Database checks passed: CRUD, constraints, cascade, reopen, migration rollback, retry, version guard.');
})().finally(() => {
  try { connection?.close(); } catch {}
  fs.rmSync(folder, { recursive: true, force: true });
}).catch((error) => { console.error(error); process.exitCode = 1; });
