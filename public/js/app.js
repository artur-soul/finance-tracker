import { api } from './api.js';

function $(sel) { return document.querySelector(sel); }

function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function hideError(el) { el.classList.add('hidden'); el.textContent = ''; }

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
    const now = new Date();
    const monthLabel = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    $('#current-month-label').textContent = monthLabel;
    $('#budget-month-label').textContent = monthLabel;
    $('#tx-date').value = now.toISOString().slice(0, 10);
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
});

document.addEventListener('DOMContentLoaded', () => {
  enterApp();
});