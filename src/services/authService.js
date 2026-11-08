import bcrypt from 'bcrypt';
import db from '../db/index.js';

const SALT_ROUNDS = 10;

export function findByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function findById(id) {
  return db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(id);
}

export async function createUser(email, password) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const stmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
  const result = stmt.run(email, passwordHash);
  return { id: result.lastInsertRowid, email };
}

export async function verifyPassword(email, password) {
  const user = findByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return { id: user.id, email: user.email };
}