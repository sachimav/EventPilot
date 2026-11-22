const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(':memory:');
const modules = new Map();
const bridge = {
  async execAsync(sql) { db.exec(sql); },
  async runAsync(sql, values = []) { const result = db.prepare(sql).run(...values); return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) }; },
  async getAllAsync(sql, values = []) { return db.prepare(sql).all(...values); },
  async getFirstAsync(sql, values = []) { return db.prepare(sql).get(...values) ?? null; },
  async closeAsync() {},
  async withTransactionAsync(action) {
    db.exec('BEGIN'); try { await action(); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; }
  },
};
function load(file) {
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index');
  if (!file.endsWith('.js')) file += '.js';
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file,module);
  const { outputText } = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  vm.runInNewContext(outputText, { exports: module.exports, TextEncoder, console,
    require: (id) => id === 'expo-sqlite' ? { openDatabaseAsync: async () => bridge } : load(path.resolve(path.dirname(file),id)) });
  return module.exports;
}
const source = (name) => path.resolve(__dirname,'../src',name);
(async () => {
  const api = load(source('database'));
  const planning = load(source('database/planning'));
  const backups = load(source('database/backups'));
  const exports = load(source('utils/eventExports'));
  const { eventPeriod } = load(source('utils/eventSchedule'));
  const { paymentSummary } = load(source('utils/payments'));
  await api.initializeDatabase();
  const id = await planning.createPlannedEvent({ name: '<Wedding>', date: '2026-12-20', time: '10:00', end_date: '2026-12-20', end_time: '18:00' }, 'wedding');
  assert.equal((await api.tasks.listByEvent(id)).length, 5);
  assert.equal((await api.activities.listByEvent(id)).length, 2);
  assert.equal((await api.events.getById(id)).status, 'planning');
  const guest = await api.guests.create({ event_id: id, name: '=Pat', rsvp: 'confirmed', plus_ones: 2, dietary: 'Vegetarian' });
  await api.guests.update(guest, { checked_in: 1 });
  assert.equal((await api.guests.getById(guest)).checked_in, 1);
  await assert.rejects(api.guests.update(guest, { plus_ones: -1 }));
  await assert.rejects(api.guests.update(guest, { rsvp: 'bogus' }));
  const vendor = await api.vendors.create({ event_id: id, name: 'Venue Co', quoted_cents: 10000, booking_status: 'booked' });
  const expense = await api.expenses.create({ event_id: id, title: 'Venue deposit', category: 'Venue', estimated_cents: 10000, amount_cents: 12000, vendor_id: vendor });
  const payment = await api.payments.create({ expense_id: expense, amount_cents: 4000, paid_at: '2026-11-15T12:00:00.000Z' });
  let money = paymentSummary(await api.expenses.getById(expense), await api.payments.listByExpense(expense));
  assert.equal(money.status, 'Partially paid'); assert.equal(money.outstanding, 8000n);
  await api.payments.update(payment, { amount_cents: 12000 });
  money = paymentSummary(await api.expenses.getById(expense), await api.payments.listByExpense(expense));
  assert.equal(money.status, 'Paid'); assert.equal(money.outstanding, 0n);
  await assert.rejects(api.payments.update(payment, { amount_cents: 0 }));
  await api.receipts.create({ expense_id: expense, name: 'receipt.pdf', mime_type: 'application/pdf', data_url: 'data:application/pdf;base64,JVBERg==' });
  await api.reminders.create({ event_id: id, title: 'Confirm flowers', remind_at: '2026-12-19T08:00:00.000Z' });
  const firstTask = (await api.tasks.listByEvent(id))[0]; await api.tasks.update(firstTask.id, { completed: 1 });
  const copy = await planning.duplicateEvent(id);
  await assert.rejects(api.expenses.create({ event_id: copy, title: 'Cross-event vendor', amount_cents: 0, vendor_id: vendor }));
  assert.equal((await api.events.getById(copy)).date, null);
  assert.equal((await api.tasks.listByEvent(copy)).every((task) => task.completed === 0 && task.due_at === null), true);
  assert.equal((await api.expenses.listByEvent(copy))[0].amount_cents, 0);
  assert.equal((await api.guests.listByEvent(copy)).length, 0);
  await api.events.update(copy, { deleted_at: new Date().toISOString() });
  assert.equal(await api.events.updateDetails(copy, { name: 'Must not change Trash' }), false);
  assert.notEqual((await api.events.getById(copy)).name, 'Must not change Trash');
  assert.equal((await api.events.list()).length, 1);
  assert.equal((await api.events.inactive()).length, 1);
  assert.equal((await api.tasks.list()).length, 5);
  await api.events.update(copy, { deleted_at: null, archived_at: null });
  assert.equal(await api.events.updateDetails(copy, { name: 'Restored draft' }), true);
  assert.equal(await api.events.updateDetails(9999999, { name: 'Missing' }), false);
  assert.equal((await api.events.list()).length, 2);
  const event = await api.events.getById(id);
  assert.equal(eventPeriod(event,new Date(2026,11,20,12,0)), 'upcoming');
  assert.equal(eventPeriod(event,new Date(2026,11,20,18,1)), 'past');
  assert.equal(eventPeriod({ ...event, status: 'completed' },new Date(2026,0,1)), 'past');
  assert.equal(eventPeriod({ ...event, status: 'cancelled' },new Date()), 'cancelled');
  const ics = exports.calendarExport([event]); assert.ok(ics.includes('BEGIN:VALARM')); assert.ok(ics.includes('DTEND:'));
  const report = exports.eventReport(event,[],[],[],[],[]); assert.ok(report.includes('&lt;Wedding&gt;')); assert.equal(report.includes('<Wedding>'),false);
  assert.ok(exports.csv([['=HYPERLINK("bad")']]).includes("'=HYPERLINK"));
  const backup = await backups.exportBackup(); const parsed = backups.parseBackup(backup);
  assert.equal(parsed.tables.Events.length, 2); assert.equal(parsed.tables.Receipts.length, 1);
  const count = db.prepare('SELECT COUNT(*) AS n FROM Events').get().n;
  await backups.restoreBackup(backup);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM Events').get().n,count * 2);
  const restored = db.prepare('SELECT * FROM Guests WHERE id > ?').get(guest);
  assert.notEqual(restored.event_id,id); assert.equal(restored.checked_in,1);
  const restoredExpense = db.prepare('SELECT * FROM Expenses WHERE event_id = ?').get(restored.event_id);
  assert.notEqual(restoredExpense.vendor_id,vendor);
  assert.equal((await api.payments.listByExpense(restoredExpense.id))[0].amount_cents,12000);
  assert.equal((await api.receipts.listByExpense(restoredExpense.id)).length,1);
  const before = db.prepare('SELECT COUNT(*) AS n FROM Events').get().n;
  const broken = JSON.parse(backup); broken.tables.Guests[0].event_id = 999999;
  await assert.rejects(backups.restoreBackup(JSON.stringify(broken)));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM Events').get().n,before);
  const unknown = JSON.parse(backup); unknown.tables.Events[0]['name); DROP TABLE Events; --'] = 'bad';
  await assert.rejects(backups.restoreBackup(JSON.stringify(unknown)));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM Events').get().n,before);
  await api.events.delete(id);
  const slot = { name: 'Reserved slot', date: '2030-12-20', time: '10:00', end_date: '2030-12-20', end_time: '12:00' };
  const reserved = await planning.createPlannedEvent(slot, 'blank');
  const recordCount = db.prepare('SELECT COUNT(*) AS n FROM Events').get().n;
  await assert.rejects(planning.createPlannedEvent({ ...slot, name: 'Overlapping template', time: '11:00' }, 'wedding'), error => error.name === 'EventScheduleConflictError' && error.conflicts[0].id === reserved);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM Events').get().n, recordCount);
  assert.equal(await api.events.updateDetails(reserved, { notes: 'Self edit allowed' }), true);
  const adjacent = await planning.createPlannedEvent({ ...slot, name: 'Adjacent', time: '12:00', end_time: '13:00' }, 'blank');
  await assert.rejects(api.events.updateDetails(adjacent, { time: '11:00' }), error => error.name === 'EventScheduleConflictError');
  assert.equal((await api.events.getById(adjacent)).time, '12:00');
  for (const field of ['archived_at', 'deleted_at']) {
    const day = field === 'archived_at' ? '2032-01-01' : '2032-01-02';
    const plan = { name: 'Recoverable plan', date: day, time: '10:00' };
    const inactive = await planning.createPlannedEvent(plan, 'blank');
    await api.events.update(inactive, { [field]: '2030-01-01T00:00:00Z' });
    const replacement = await planning.createPlannedEvent({ ...plan, name: 'Replacement' }, 'blank');
    await assert.rejects(api.events.update(inactive, { archived_at: null, deleted_at: null }), error => error.name === 'EventScheduleConflictError');
    assert.ok((await api.events.getById(inactive))[field], 'Failed restoration preserves inactive state');
    await api.events.update(replacement, { archived_at: '2030-01-01T00:00:00Z' });
    const recoveries = await Promise.allSettled([
      api.events.update(inactive, { archived_at: null, deleted_at: null }),
      api.events.update(replacement, { archived_at: null }),
    ]);
    assert.equal(recoveries.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(recoveries.filter(result => result.status === 'rejected').length, 1);
    assert.equal((await api.events.getById(inactive))[field], null);
  }
  const results = await Promise.allSettled([
    planning.createPlannedEvent({ name: 'Concurrent A', date: '2031-01-01', time: '09:00' }, 'blank'),
    planning.createPlannedEvent({ name: 'Concurrent B', date: '2031-01-01', time: '09:00' }, 'blank'),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected' && result.reason.name === 'EventScheduleConflictError').length, 1);
  assert.equal(await api.guests.getById(guest),null); assert.equal(await api.payments.getById(payment),null);
  assert.equal((await api.reminders.listByEvent(id)).length,0);
  console.log('Planning features passed: migration, guests/RSVP/check-in, vendors/payments/receipts, templates/duplication, archive/trash, duration/status, safe exports, transactional backup restore and relationship remapping.');
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.close());
