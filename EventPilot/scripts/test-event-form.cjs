const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/eventForm.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const context = { exports: {} };
vm.runInNewContext(outputText, context);
const { emptyEvent, validateEvent, budgetCents, toEventInput, fromEvent, validDate, dateString, timeString, parseEventId } = context.exports;

for (const field of ['title', 'category', 'date', 'time', 'location', 'budget']) {
  assert.ok(validateEvent(emptyEvent)[field], `${field} is required`);
}
assert.equal(validateEvent(emptyEvent).description, undefined);
assert.equal(validDate('2028-02-29'), true);
for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '0000-01-01', '12/01/2026']) assert.equal(validDate(value), false);
assert.equal(dateString(new Date(2026, 10, 14, 23, 45)), '2026-11-14');
assert.equal(timeString(new Date(2026, 10, 14, 0, 5)), '00:05');
assert.equal(budgetCents('0'), 0);
assert.equal(budgetCents(' 123.45 '), 12345);
assert.equal(budgetCents('0.1'), 10);
assert.equal(budgetCents('90071992547409.91'), Number.MAX_SAFE_INTEGER);
for (const value of ['', '-1', 'NaN', 'Infinity', '1.001', '1e3', '1,000', '90071992547409.92']) assert.equal(budgetCents(value), null);
const values = { title: ' Party ', description: ' Details ', category: ' Birthday ', date: '2026-12-01', time: '00:00', location: ' Colombo ', budget: '123.45' };
assert.equal(Object.keys(validateEvent(values)).length, 0);
const input = toEventInput(values);
assert.equal(input.name, 'Party');
assert.equal(input.notes, 'Details');
assert.equal(input.category, 'Birthday');
assert.equal(input.location, 'Colombo');
assert.equal(input.budget_cents, 12345);
for (const time of ['24:00', '12:60', '9:00']) assert.ok(validateEvent({ ...values, time }).time);
assert.throws(() => toEventInput(emptyEvent));
assert.equal(fromEvent({ ...input, budget_cents: Number.MAX_SAFE_INTEGER }).budget, '90071992547409.91');
assert.equal(parseEventId('12'), 12);
for (const value of ['sample-event', '-1', '0', '1e2', '1.5', undefined, ['1'], '99999999999999999999']) assert.equal(parseEventId(value), null);
console.log('Event form checks passed: required fields, dates, times, exact budgets, mapping, route IDs.');
