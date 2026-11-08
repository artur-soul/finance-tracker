import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listBudgets, setBudget, deleteBudget } from '../services/budgetsService.js';

const router = Router();
router.use(requireAuth);

function validateBudget({ category_id, month, limit_amount }) {
  const errors = [];
  if (!category_id || !Number.isInteger(Number(category_id))) errors.push('Категория обязательна');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) errors.push('Месяц должен быть в формате YYYY-MM');
  if (!limit_amount || isNaN(limit_amount) || Number(limit_amount) <= 0) {
    errors.push('Лимит должен быть положительным числом');
  }
  return errors;
}

// GET /api/budgets?month=YYYY-MM
router.get('/', (req, res) => {
  const month = req.query.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Параметр month обязателен в формате YYYY-MM' });
  }
  res.json({ budgets: listBudgets(req.session.userId, month) });
});

// POST /api/budgets
router.post('/', (req, res) => {
  const errors = validateBudget(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const result = setBudget(req.session.userId, {
    category_id: Number(req.body.category_id),
    month: req.body.month,
    limit_amount: Number(req.body.limit_amount),
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json(result);
});

// DELETE /api/budgets/:id
router.delete('/:id', (req, res) => {
  const ok = deleteBudget(req.session.userId, Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Бюджет не найден' });
  res.json({ ok: true });
});

export default router;