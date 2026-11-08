async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || (data.errors && data.errors.join('; ')) || 'Ошибка запроса');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  register: (email, password) => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  listCategories: () => request('/api/categories'),
  createCategory: (name, type) => request('/api/categories', { method: 'POST', body: JSON.stringify({ name, type }) }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),

  listTransactions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/transactions${qs ? '?' + qs : ''}`);
  },
  createTransaction: (payload) => request('/api/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  deleteTransaction: (id) => request(`/api/transactions/${id}`, { method: 'DELETE' }),
  summary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/transactions/summary${qs ? '?' + qs : ''}`);
  },

  listBudgets: (month) => request(`/api/budgets?month=${month}`),
  setBudget: (payload) => request('/api/budgets', { method: 'POST', body: JSON.stringify(payload) }),

  byCategory: (month) => request(`/api/reports/by-category?month=${month}`),
  monthly: (months = 6) => request(`/api/reports/monthly?months=${months}`),
};