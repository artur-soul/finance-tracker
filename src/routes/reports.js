import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { expensesByCategory, monthlyDynamics } from '../services/reportsService.js';

const router = Router();
router.use(requireAuth);

// GET /api/reports/by-category?month=YYYY-MM
router.get('/by-category', (req, res) => {
  const month = req.query.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Параметр month обязателен в формате YYYY-MM' });
  }
  res.json({ data: expensesByCategory(req.session.userId, month) });
});

// GET /api/reports/monthly?months=6
router.get('/monthly', (req, res) => {
  const months = Number(req.query.months) || 6;
  if (months < 1 || months > 24) {
    return res.status(400).json({ error: 'Параметр months должен быть от 1 до 24' });
  }
  res.json({ data: monthlyDynamics(req.session.userId, months) });
});

export default router;