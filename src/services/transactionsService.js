import db from '../db/index.js';

export function listTransactions(userId, { from, to, categoryId } = {}) {
  let sql = `
    SELECT t.*, c.name AS category_name, c.type AS category_type
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?
  `;
  const params = [userId];

  if (from) { sql += ' AND t.date >= ?'; params.push(from); }
  if (to)   { sql += ' AND t.date <= ?'; params.push(to); }
  if (categoryId) { sql += ' AND t.category_id = ?'; params.push(categoryId); }

  sql += ' ORDER BY t.date DESC, t.id DESC';
  return db.prepare(sql).all(...params);
}

export function getTransaction(userId, id) {
  return db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId);
}

export function createTransaction(userId, { category_id, amount, date, note }) {
  // Проверяем, что категория принадлежит пользователю
  const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, userId);
  if (!cat) return { error: 'Категория не найдена' };

  const stmt = db.prepare(`
    INSERT INTO transactions (user_id, category_id, amount, date, note)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, category_id, amount, date, note || null);
  return { transaction: getTransaction(userId, result.lastInsertRowid) };
}

export function deleteTransaction(userId, id) {
  const result = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}

export function getSummary(userId, { from, to } = {}) {
  let sql = `
    SELECT c.type, SUM(t.amount) AS total
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?
  `;
  const params = [userId];
  if (from) { sql += ' AND t.date >= ?'; params.push(from); }
  if (to)   { sql += ' AND t.date <= ?'; params.push(to); }
  sql += ' GROUP BY c.type';

  const rows = db.prepare(sql).all(...params);
  const result = { income: 0, expense: 0 };
  for (const r of rows) result[r.type] = r.total;
  result.balance = result.income - result.expense;
  return result;
}