import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listTransactions,
  createTransaction,
  deleteTransaction,
  getSummary,
} from '../services/transactionsService.js';

const router = Router();
router.use(requireAuth);

function validateTransaction({ category_id, amount, date }) {
  const errors = [];
  if (!category_id || !Number.isInteger(Number(category_id))) errors.push('Категория обязательна');
  if (!amount || isNaN(amount) || Number(amount) <= 0) errors.push('Сумма должна быть положительным числом');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('Дата должна быть в формате YYYY-MM-DD');
  return errors;
}

// GET /api/transactions?from=&to=&category_id=
router.get('/', (req, res) => {
  const list = listTransactions(req.session.userId, {
    from: req.query.from,
    to: req.query.to,
    categoryId: req.query.category_id,
  });
  res.json({ transactions: list });
});

// GET /api/transactions/summary?from=&to=
router.get('/summary', (req, res) => {
  const summary = getSummary(req.session.userId, {
    from: req.query.from,
    to: req.query.to,
  });
  res.json({ summary });
});

// POST /api/transactions
router.post('/', (req, res) => {
  const errors = validateTransaction(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const result = createTransaction(req.session.userId, {
    category_id: Number(req.body.category_id),
    amount: Number(req.body.amount),
    date: req.body.date,
    note: req.body.note,
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json(result);
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const ok = deleteTransaction(req.session.userId, Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Операция не найдена' });
  res.json({ ok: true });
});

export default router;