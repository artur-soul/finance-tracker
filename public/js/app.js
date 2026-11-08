import { api } from './api.js';

// ===== Утилиты =====
function $(sel) { return document.querySelector(sel); }
function formatMoney(n) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'BYN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}
function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function hideError(el) { el.classList.add('hidden'); el.textContent = ''; }
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function currentMonthLabel() {
  return new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// ===== Состояние =====
let categories = [];
let chartCategories = null;
let chartMonthly = null;
let filters = { from: '', to: '' };

// ===== Авторизация =====
const authScreen = $('#auth-screen');
const appScreen = $('#app-screen');
const authForm = $('#auth-form');
const authError = $('#auth-error');
const authSubmit = $('#auth-submit');
const tabLogin = $('#tab-login');
const tabRegister = $('#tab-register');

let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  tabLogin.classList.toggle('active', mode === 'login');
  tabRegister.classList.toggle('active', mode === 'register');
  authSubmit.textContent = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
  hideError(authError);
}

tabLogin.addEventListener('click', () => setAuthMode('login'));
tabRegister.addEventListener('click', () => setAuthMode('register'));

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(authError);
  authSubmit.disabled = true;
  try {
    const email = $('#auth-email').value.trim();
    const password = $('#auth-password').value;
    if (authMode === 'login') {
      await api.login(email, password);
    } else {
      await api.register(email, password);
    }
    await enterApp();
  } catch (err) {
    showError(authError, err.message);
  } finally {
    authSubmit.disabled = false;
  }
});

async function enterApp() {
  try {
    const me = await api.me();
    $('#user-email').textContent = `ID: ${me.userId}`;
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    $('#current-month-label').textContent = currentMonthLabel();
    $('#budget-month-label').textContent = currentMonthLabel();
    $('#tx-date').value = new Date().toISOString().slice(0, 10);

    await loadAll();
  } catch {
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }
}

$('#logout-btn').addEventListener('click', async () => {
  try { await api.logout(); } catch {}
  appScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  authForm.reset();
  setAuthMode('login');
  categories = [];
  filters = { from: '', to: '' };
  if (chartCategories) { chartCategories.destroy(); chartCategories = null; }
  if (chartMonthly) { chartMonthly.destroy(); chartMonthly = null; }
});

// ===== Загрузка всего =====
async function loadAll() {
  await loadCategories();
  await Promise.all([
    loadSummaryAndCharts(),
    loadBudgets(),
    loadTransactions(),
  ]);
}

// ===== Сводка и графики =====
async function loadSummaryAndCharts() {
  const month = currentMonthKey();
  const from = `${month}-01`;
  const to = `${month}-31`;

  try {
    const { summary } = await api.summary({ from, to });
    $('#sum-income').textContent = formatMoney(summary.income);
    $('#sum-expense').textContent = formatMoney(summary.expense);
    $('#sum-balance').textContent = formatMoney(summary.balance);
  } catch (err) {
    console.error(err);
  }

  try {
    const { data } = await api.byCategory(month);
    renderCategoriesChart(data);
  } catch (err) {
    console.error(err);
  }

  try {
    const { data } = await api.monthly(6);
    renderMonthlyChart(data);
  } catch (err) {
    console.error(err);
  }
}

function renderCategoriesChart(data) {
  const canvas = $('#chart-categories');
  const emptyMsg = $('#chart-categories-empty');
  if (!data || data.length === 0) {
    canvas.classList.add('hidden');
    emptyMsg.classList.remove('hidden');
    if (chartCategories) { chartCategories.destroy(); chartCategories = null; }
    return;
  }
  canvas.classList.remove('hidden');
  emptyMsg.classList.add('hidden');
  const labels = data.map(d => d.category_name);
  const values = data.map(d => Number(d.total));
  const palette = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
  if (chartCategories) chartCategories.destroy();
  chartCategories = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette.slice(0, values.length),
        borderWidth: 2,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#fff',
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
  });
}

function renderMonthlyChart(data) {
  const canvas = $('#chart-monthly');
  const labels = (data || []).map(d => {
    const [y, m] = d.month.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
  });
  const incomes = (data || []).map(d => Number(d.income));
  const expenses = (data || []).map(d => Number(d.expense));
  if (chartMonthly) chartMonthly.destroy();
  chartMonthly = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Доходы', data: incomes, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', tension: 0.3, fill: true },
        { label: 'Расходы', data: expenses, borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', tension: 0.3, fill: true },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } },
  });
}

// ===== Бюджеты =====
async function loadBudgets() {
  const container = $('#budgets-list');
  try {
    const { budgets } = await api.listBudgets(currentMonthKey());
    if (!budgets || budgets.length === 0) {
      container.innerHTML = '<p class="empty-msg">Бюджеты не заданы.</p>';
      return;
    }
    container.innerHTML = budgets.map(b => {
      const pct = Math.min(100, Math.round((b.spent / b.limit_amount) * 100));
      return `
        <div class="budget-item ${b.exceeded ? 'exceeded' : ''}">
          <div class="budget-name">${escapeHtml(b.category_name)}${b.exceeded ? ' ⚠️' : ''}</div>
          <div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%"></div></div>
          <div class="budget-values">
            <span>${formatMoney(b.spent)}</span>
            <span>из ${formatMoney(b.limit_amount)}</span>
          </div>
          ${b.exceeded ? '<div class="error" style="margin-top:0.5em">Бюджет превышен!</div>' : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="empty-msg">Не удалось загрузить бюджеты.</p>';
  }
}

// ===== Категории =====
async function loadCategories() {
  try {
    const { categories: list } = await api.listCategories();
    categories = list;
    renderCategorySelect();
    renderCategoryList();
  } catch (err) {
    console.error(err);
  }
}

function renderCategorySelect() {
  const select = $('#tx-category');
  if (categories.length === 0) {
    select.innerHTML = '<option value="">— нет категорий —</option>';
    return;
  }
  select.innerHTML = categories.map(c =>
    `<option value="${c.id}">${escapeHtml(c.name)} (${c.type === 'income' ? 'доход' : 'расход'})</option>`
  ).join('');
}

function renderCategoryList() {
  const ul = $('#cat-list');
  if (categories.length === 0) {
    ul.innerHTML = '<li class="empty-msg">Категорий пока нет.</li>';
    return;
  }
  ul.innerHTML = categories.map(c => `
    <li>
      <span>${escapeHtml(c.name)}<span class="cat-type-label">${c.type === 'income' ? 'доход' : 'расход'}</span></span>
      <button class="delete-btn" data-id="${c.id}" data-name="${escapeHtml(c.name)}" type="button">Удалить</button>
    </li>
  `).join('');
  ul.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Удалить категорию «${btn.dataset.name}»? Все операции по ней тоже удалятся.`)) return;
      try {
        await api.deleteCategory(btn.dataset.id);
        await loadAll();
      } catch (err) { alert(err.message); }
    });
  });
}

$('#cat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError($('#cat-error'));
  const name = $('#cat-name').value.trim();
  const type = $('#cat-type').value;
  if (!name) return;
  try {
    await api.createCategory(name, type);
    $('#cat-name').value = '';
    await loadCategories();
  } catch (err) {
    showError($('#cat-error'), err.message);
  }
});

// ===== Операции =====
async function loadTransactions() {
  const tbody = $('#tx-tbody');
  try {
    const params = {};
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    const { transactions } = await api.listTransactions(params);
    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">Операций пока нет.</td></tr>';
      return;
    }
    tbody.innerHTML = transactions.map(t => {
      const sign = t.category_type === 'income' ? '+' : '−';
      const cls = t.category_type === 'income' ? 'amount-income' : 'amount-expense';
      return `
        <tr>
          <td>${t.date}</td>
          <td>${escapeHtml(t.category_name)}</td>
          <td class="${cls}">${sign} ${formatMoney(t.amount)}</td>
          <td>${escapeHtml(t.note || '')}</td>
          <td><button class="delete-btn" data-id="${t.id}" type="button" title="Удалить">✕</button></td>
        </tr>
      `;
    }).join('');
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Удалить операцию?')) return;
        try {
          await api.deleteTransaction(btn.dataset.id);
          await loadAll();
        } catch (err) { alert(err.message); }
      });
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">Не удалось загрузить операции.</td></tr>';
  }
}

$('#tx-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError($('#tx-error'));
  const payload = {
    category_id: Number($('#tx-category').value),
    amount: Number($('#tx-amount').value),
    date: $('#tx-date').value,
    note: $('#tx-note').value.trim() || null,
  };
  if (!payload.category_id) {
    showError($('#tx-error'), 'Сначала создайте категорию');
    return;
  }
  try {
    await api.createTransaction(payload);
    $('#tx-amount').value = '';
    $('#tx-note').value = '';
    await loadAll();
  } catch (err) {
    showError($('#tx-error'), err.message);
  }
});

// Фильтры
$('#filter-apply').addEventListener('click', () => {
  filters.from = $('#filter-from').value;
  filters.to = $('#filter-to').value;
  loadTransactions();
});
$('#filter-reset').addEventListener('click', () => {
  filters = { from: '', to: '' };
  $('#filter-from').value = '';
  $('#filter-to').value = '';
  loadTransactions();
});

// ===== Старт =====
document.addEventListener('DOMContentLoaded', () => {
  enterApp();
});