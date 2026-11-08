import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategory,
} from '../services/categoriesService.js';

const router = Router();
router.use(requireAuth);

function validateCategory({ name, type }) {
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim().length === 0) errors.push('Название обязательно');
  else if (name.length > 50) errors.push('Название не длиннее 50 символов');
  if (!type || !['income', 'expense'].includes(type)) errors.push('Тип должен быть income или expense');
  return errors;
}

// GET /api/categories
router.get('/', (req, res) => {
  res.json({ categories: listCategories(req.session.userId) });
});

// POST /api/categories
router.post('/', (req, res) => {
  const errors = validateCategory(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const cat = createCategory(req.session.userId, {
    name: req.body.name.trim(),
    type: req.body.type,
  });
  res.status(201).json({ category: cat });
});

// PUT /api/categories/:id
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!getCategory(req.session.userId, id)) {
    return res.status(404).json({ error: 'Категория не найдена' });
  }
  const errors = validateCategory(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const updated = updateCategory(req.session.userId, id, {
    name: req.body.name.trim(),
    type: req.body.type,
  });
  res.json({ category: updated });
});

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const ok = deleteCategory(req.session.userId, id);
  if (!ok) return res.status(404).json({ error: 'Категория не найдена' });
  res.json({ ok: true });
});

export default router;