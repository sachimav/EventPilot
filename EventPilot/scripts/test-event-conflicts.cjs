const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
process.env.TZ = 'Asia/Colombo';
function load(file) {
  if (!file.endsWith('.js')) file += '.js';
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  vm.runInNewContext(outputText, { exports, require: id => load(path.resolve(path.dirname(file), id)) });
  return exports;
}
const { eventInterval, findEventConflicts } = load(path.resolve(__dirname, '../src/utils/eventConflicts'));
const existing = { id: 1, name: 'Conference', date: '2030-12-20', time: '10:00', end_date: '2030-12-20', end_time: '12:00' };
const candidate = (time, end_time, extra = {}) => ({ ...existing, id: undefined, time, end_time, ...extra });
for (const event of [candidate('10:00', '12:00'), candidate('09:00', '11:00'), candidate('11:00', '13:00'), candidate('10:30', '11:00'), candidate('09:00', '13:00')]) {
  assert.equal(findEventConflicts(event, [existing]).length, 1);
}
for (const event of [candidate('08:00', '10:00'), candidate('12:00', '13:00'), candidate('13:00', '14:00'), candidate('10:00', '12:00', { date: '2030-12-21', end_date: '2030-12-21' })]) {
  assert.equal(findEventConflicts(event, [existing]).length, 0);
}
assert.equal(findEventConflicts(existing, [existing], 1).length, 0);
assert.equal(eventInterval({ date: '2030-12-20', time: '23:30' }).end - eventInterval({ date: '2030-12-20', time: '23:30' }).start, 3600000);
assert.equal(findEventConflicts({ date: '2030-12-21', time: '00:15' }, [{ id: 2, date: '2030-12-20', time: '23:30' }]).length, 1);
assert.equal(findEventConflicts({ date: '2030-12-21', time: '12:00' }, [{ ...existing, end_date: '2030-12-22' }]).length, 1);
for (const extra of [{ status: 'cancelled' }, { archived_at: '2030-01-01' }, { deleted_at: '2030-01-01' }]) {
  assert.equal(findEventConflicts(existing, [{ ...existing, ...extra }]).length, 0);
  assert.equal(findEventConflicts({ ...existing, ...extra }, [existing]).length, 0);
}
assert.equal(eventInterval({}), null);
assert.equal(findEventConflicts({ date: null, time: null }, [existing]).length, 0);
console.log('Event conflicts passed: identical, partial, contained, adjacent, separate dates, multi-day, overnight default duration, self exclusion, and inactive events.');
