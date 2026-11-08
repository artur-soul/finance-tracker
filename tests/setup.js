import { beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const testDbPath = path.resolve('data/test.db');

beforeAll(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = testDbPath + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  process.env.DB_PATH = './data/test.db';
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test_secret';
});

afterAll(async () => {
  try {
    // Закрываем соединение с БД, иначе Windows не даст удалить файл
    const dbModule = await import('../src/db/index.js');
    if (dbModule?.default?.close) dbModule.default.close();
  } catch {}

  // Небольшая пауза, чтобы Windows освободил файл
  await new Promise(r => setTimeout(r, 100));

  for (const suffix of ['', '-wal', '-shm']) {
    const p = testDbPath + suffix;
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch {}
    }
  }
});