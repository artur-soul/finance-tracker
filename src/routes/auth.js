import { Router } from 'express';
import { createUser, findByEmail, verifyPassword } from '../services/authService.js';

const router = Router();

// Простая валидация email и пароля
function validateCredentials(email, password) {
  const errors = [];
  if (!email || typeof email !== 'string') errors.push('Email обязателен');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Некорректный email');
  if (!password || typeof password !== 'string') errors.push('Пароль обязателен');
  else if (password.length < 6) errors.push('Пароль должен быть не короче 6 символов');
  return errors;
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const errors = validateCredentials(email, password);
    if (errors.length) return res.status(400).json({ errors });

    if (findByEmail(email)) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const user = await createUser(email, password);
    req.session.userId = user.id;
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const errors = validateCredentials(email, password);
    if (errors.length) return res.status(400).json({ errors });

    const user = await verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    req.session.userId = user.id;
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /api/auth/me — кто я сейчас
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Не авторизован' });
  res.json({ userId: req.session.userId });
});

export default router;