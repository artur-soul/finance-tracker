import { describe, it, expect, beforeEach } from 'vitest';
import './setup.js';
import db from '../src/db/index.js';
import { getSummary } from '../src/services/transactionsService.js';
import { listBudgets } from '../src/services/budgetsService.js';

let userId;
let catIncome;
let catExpense;

beforeEach(() => {
  // Очищаем таблицы
  db.exec('DELETE FROM transactions; DELETE FROM budgets; DELETE FROM categories; DELETE FROM users;');

  const u = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run('test@test.ru', 'hash');
  userId = u.lastInsertRowid;

  catIncome = db.prepare("INSERT INTO categories (user_id, name, type) VALUES (?, 'Salary', 'income')").run(userId).lastInsertRowid;
  catExpense = db.prepare("INSERT INTO categories (user_id, name, type) VALUES (?, 'Food', 'expense')").run(userId).lastInsertRowid;
});

describe('getSummary', () => {
  it('правильно считает доходы, расходы и баланс за период', () => {
    db.prepare('INSERT INTO transactions (user_id, category_id, amount, date) VALUES (?, ?, ?, ?)').run(userId, catIncome, 1000, '2026-11-01');
    db.prepare('INSERT INTO transactions (user_id, category_id, amount, date) VALUES (?, ?, ?, ?)').run(userId, catExpense, 300, '2026-11-02');
    db.prepare('INSERT INTO transactions (user_id, category_id, amount, date) VALUES (?, ?, ?, ?)').run(userId, catExpense, 200, '2026-11-03');

    const s = getSummary(userId, { from: '2026-11-01', to: '2026-11-30' });
    expect(s.income).toBe(1000);
    expect(s.expense).toBe(500);
    expect(s.balance).toBe(500);
  });

  it('не учитывает операции вне периода', () => {
    db.prepare('INSERT INTO transactions (user_id, category_id, amount, date) VALUES (?, ?, ?, ?)').run(userId, catExpense, 100, '2026-10-15');
    db.prepare('INSERT INTO transactions (user_id, category_id, amount, date) VALUES (?, ?, ?, ?)').run(userId, catExpense, 50, '2026-11-15');

    const s = getSummary(userId, { from: '2026-11-01', to: '2026-11-30' });
    expect(s.expense).toBe(50);
  });
});

describe('listBudgets', () => {
  it('считает spent и правильно ставит exceeded=false, когда лимит не превышен', () => {
    db.prepare('INSERT INTO budgets (user_id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)').run(userId, catExpense, '2026-11', 500);
    db.prepare('INSERT INTO transactions (user_id, category_id, amount, date) VALUES (?, ?, ?, ?)').run(userId, catExpense, 200, '2026-11-05');

    const budgets = listBudgets(userId, '2026-11');
    expect(budgets).toHaveLength(1);
    expect(budgets[0].spent).toBe(200);
    expect(budgets[0].exceeded).toBe(false);
  });

  it('ставит exceeded=true, когда лимит превышен', () => {
    db.prepare('INSERT INTO budgets (user_id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)').run(userId, catExpense, '2026-11', 100);
    db.prepare('INSERT INTO transactions (user_id, category_id, amount, date) VALUES (?, ?, ?, ?)').run(userId, catExpense, 250, '2026-11-05');

    const budgets = listBudgets(userId, '2026-11');
    expect(budgets[0].exceeded).toBe(true);
  });
});