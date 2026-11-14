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
const { emptyExpense, validateExpense, toExpenseInput, fromExpense, formatLkr, summarizeExpenses } = load(path.join(__dirname, '../src/utils/budgetManager.ts'));
const db = new DatabaseSync(':memory:');
try {
  db.exec('PRAGMA foreign_keys = ON');
  for (const sql of migrations) db.exec(sql);
  for (const field of ['category', 'description', 'estimated', 'actual']) assert.ok(validateExpense(emptyExpense)[field]);
  const values = { category: ' Venue ', description: " Hall deposit ' ", estimated: '1000.50', actual: '0' };
  assert.equal(Object.keys(validateExpense(values)).length, 0);
  const input = toExpenseInput(values, 1);
  assert.equal(input.title, "Hall deposit '");
  assert.equal(input.category, 'Venue');
  assert.equal(input.estimated_cents, 100050);
  assert.equal(input.amount_cents, 0);
  for (const invalid of ['', '-1', 'NaN', 'Infinity', '1.001', '1e9', '90071992547409.92']) {
    for (const field of ['estimated', 'actual']) {
      assert.ok(validateExpense({ ...values, [field]: invalid })[field]);
      assert.throws(() => toExpenseInput({ ...values, [field]: invalid }, 1));
    }
  }
  for (const id of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => toExpenseInput(values, id));
  assert.equal(formatLkr(0), 'Rs. 0.00');
  assert.equal(formatLkr(123450), 'Rs. 1,234.50');
  assert.equal(formatLkr(1), 'Rs. 0.01');
  db.exec("INSERT INTO Events (name) VALUES ('Wedding'), ('Conference')");
  const insert = db.prepare('INSERT INTO Expenses (event_id, title, category, estimated_cents, amount_cents) VALUES (?, ?, ?, ?, ?)');
  const expenseId = Number(insert.run(1, input.title, input.category, input.estimated_cents, input.amount_cents).lastInsertRowid);
  insert.run(1, 'Catering', 'Food', 20000, 10000);
  insert.run(1, 'Extra chairs', ' venue ', 5000, 4000);
  insert.run(2, 'Other event', 'Venue', 999999, 999999);
  const read = () => db.prepare('SELECT * FROM Expenses WHERE event_id = ? ORDER BY id DESC').all(1);
  let result = summarizeExpenses(read());
  assert.equal(result.estimated, 125050n);
  assert.equal(result.actual, 14000n);
  assert.equal(result.categories.length, 2);
  assert.equal(result.categories.find((group) => group.category.trim().toLowerCase() === 'venue').count, 2);
  const form = fromExpense(db.prepare('SELECT * FROM Expenses WHERE id = ?').get(expenseId));
  assert.equal(form.estimated, '1000.50');
  assert.equal(form.actual, '0.00');
  db.prepare('UPDATE Expenses SET estimated_cents = ?, amount_cents = ? WHERE id = ?').run(50000, 45000, expenseId);
  result = summarizeExpenses(read());
  assert.equal(result.estimated, 75000n);
  assert.equal(result.actual, 59000n);
  assert.throws(() => insert.run(1, 'Invalid', 'Venue', -1, 0));
  assert.throws(() => insert.run(1, 'Invalid', 'Venue', 0, -1));
  assert.throws(() => insert.run(1, 'Invalid', 'Venue', 1.5, 0));
  assert.throws(() => insert.run(999, 'Orphan', 'Venue', 0, 0));
  db.prepare('DELETE FROM Expenses WHERE id = ?').run(expenseId);
  assert.equal(summarizeExpenses(read()).actual, 14000n);
  const huge = summarizeExpenses([0, 1].map((id) => ({ id, category: 'Venue', estimated_cents: Number.MAX_SAFE_INTEGER, amount_cents: Number.MAX_SAFE_INTEGER })));
  assert.equal(huge.actual, BigInt(Number.MAX_SAFE_INTEGER) * 2n);
  assert.equal(formatLkr(huge.actual), 'Rs. 180,143,985,094,819.82');
  db.prepare('DELETE FROM Events WHERE id = ?').run(1);
  assert.equal(read().length, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM Expenses WHERE event_id = 2').get().count, 1);
  assert.equal(summarizeExpenses([]).estimated, 0n);
  assert.equal(summarizeExpenses([]).categories.length, 0);
  console.log('Budget checks passed: validation, exact LKR amounts, event isolation, category totals, edit/delete refresh, database constraints, and cascades.');
} finally { db.close(); }
