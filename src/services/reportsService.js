import db from '../db/index.js';

// Расходы по категориям за конкретный месяц (для круговой диаграммы)
export function expensesByCategory(userId, month) {
  const rows = db.prepare(`
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      SUM(t.amount) AS total
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?
      AND c.type = 'expense'
      AND substr(t.date, 1, 7) = ?
    GROUP BY c.id
    ORDER BY total DESC
  `).all(userId, month);

  return rows.map(r => ({ ...r, total: Number(r.total) }));
}

// Динамика по месяцам: доходы и расходы за последние N месяцев
export function monthlyDynamics(userId, monthsBack = 6) {
  // Определяем границу: сегодня минус N месяцев
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = db.prepare(`
    SELECT
      substr(t.date, 1, 7) AS month,
      c.type AS type,
      SUM(t.amount) AS total
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ? AND t.date >= ?
    GROUP BY month, c.type
    ORDER BY month
  `).all(userId, cutoffStr);

  // Группируем в { '2026-11': { income, expense } }
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.month)) map.set(r.month, { month: r.month, income: 0, expense: 0 });
    map.get(r.month)[r.type] = Number(r.total);
  }

  return Array.from(map.values());
}