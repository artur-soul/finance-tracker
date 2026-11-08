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

// ===== Состояние =====
let categories = [];
let chartCategories = null;
let chartMonthly = null;

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
  if (chartCategories) { chartCategories.destroy(); chartCategories = null; }
  if (chartMonthly) { chartMonthly.destroy(); chartMonthly = null; }
});

// ===== Загрузка всех данных =====
async function loadAll() {
  await Promise.all([
    loadCategories(),
    loadSummaryAndCharts(),
    loadBudgets(),
  ]);
}

// ===== Сводка + графики =====
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
    console.error('Ошибка загрузки сводки:', err);
    $('#sum-income').textContent = '—';
    $('#sum-expense').textContent = '—';
    $('#sum-balance').textContent = '—';
  }

  // Круговая диаграмма: расходы по категориям
  try {
    const { data } = await api.byCategory(month);
    renderCategoriesChart(data);
  } catch (err) {
    console.error('Ошибка загрузки отчёта по категориям:', err);
  }

  // Линейная диаграмма: динамика 6 месяцев
  try {
    const { data } = await api.monthly(6);
    renderMonthlyChart(data);
  } catch (err) {
    console.error('Ошибка загрузки динамики:', err);
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
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
    },
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
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// ===== Бюджеты =====
async function loadBudgets() {
  const container = $('#budgets-list');
  try {
    const { budgets } = await api.listBudgets(currentMonthKey());
    if (!budgets || budgets.length === 0) {
      container.innerHTML = '<p class="empty-msg">Бюджеты не заданы. Добавьте бюджет через API или в следующей версии интерфейса.</p>';
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
    console.error('Ошибка загрузки бюджетов:', err);
    container.innerHTML = '<p class="empty-msg">Не удалось загрузить бюджеты.</p>';
  }
}

// ===== Категории (пока только загрузка для селекта) =====
async function loadCategories() {
  try {
    const { categories: list } = await api.listCategories();
    categories = list;
    const select = $('#tx-category');
    select.innerHTML = categories.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)} (${c.type === 'income' ? 'доход' : 'расход'})</option>`
    ).join('');
  } catch (err) {
    console.error('Ошибка загрузки категорий:', err);
  }
}

// ===== Экранирование (защита от XSS при вставке в innerHTML) =====
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// ===== Старт =====
document.addEventListener('DOMContentLoaded', () => {
  enterApp();
});