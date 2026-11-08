import db from '../db/index.js';

export function listCategories(userId) {
  return db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY type, name').all(userId);
}

export function getCategory(userId, id) {
  return db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, userId);
}

export function createCategory(userId, { name, type }) {
  const stmt = db.prepare('INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)');
  const result = stmt.run(userId, name, type);
  return getCategory(userId, result.lastInsertRowid);
}

export function updateCategory(userId, id, { name, type }) {
  const existing = getCategory(userId, id);
  if (!existing) return null;
  db.prepare('UPDATE categories SET name = ?, type = ? WHERE id = ? AND user_id = ?')
    .run(name, type, id, userId);
  return getCategory(userId, id);
}

export function deleteCategory(userId, id) {
  const result = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}