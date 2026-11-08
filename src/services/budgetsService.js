import db from '../db/index.js';

export function listBudgets(userId, month) {
  // Получаем бюджеты на месяц + сколько потрачено по каждой категории
  const rows = db.prepare(`
    SELECT
      b.id,
      b.category_id,
      b.month,
      b.limit_amount,
      c.name AS category_name,
      COALESCE(SUM(t.amount), 0) AS spent
    FROM budgets b
    JOIN categories c ON c.id = b.category_id
    LEFT JOIN transactions t
      ON t.category_id = b.category_id
     AND t.user_id = b.user_id
     AND substr(t.date, 1, 7) = b.month
    WHERE b.user_id = ? AND b.month = ?
    GROUP BY b.id
    ORDER BY c.name
  `).all(userId, month);

  return rows.map(r => ({
    ...r,
    spent: Number(r.spent),
    exceeded: Number(r.spent) > Number(r.limit_amount),
  }));
}

export function setBudget(userId, { category_id, month, limit_amount }) {
  // Проверяем, что категория существует, принадлежит пользователю и это расход
  const cat = db.prepare(
    'SELECT id, type FROM categories WHERE id = ? AND user_id = ?'
  ).get(category_id, userId);
  if (!cat) return { error: 'Категория не найдена' };
  if (cat.type !== 'expense') return { error: 'Бюджет можно задать только для категории расходов' };

  // UPSERT: если бюджет на эту категорию+месяц уже есть — обновляем лимит
  db.prepare(`
    INSERT INTO budgets (user_id, category_id, month, limit_amount)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, category_id, month)
    DO UPDATE SET limit_amount = excluded.limit_amount
  `).run(userId, category_id, month, limit_amount);

  const saved = db.prepare(
    'SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?'
  ).get(userId, category_id, month);

  return { budget: saved };
}

export function deleteBudget(userId, id) {
  const result = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}