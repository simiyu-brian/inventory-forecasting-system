import {
  mockSummary,
  mockInventory,
  mockAlerts,
  mockSales,
  mockForecast,
  mockModelsComparison,
  mockReorderSuggestions,
  mockPurchaseOrders,
  mockUsers,
  PRODUCT_LINES,
} from './mockData';

// When VITE_API_BASE_URL is set the app talks to the real server.
// Leave it unset (or empty) in .env to keep using mock data locally.
const BASE_URL    = import.meta.env.VITE_API_BASE_URL || '';
const FORECAST_URL = import.meta.env.VITE_FORECAST_URL || 'http://127.0.0.1:8000';
const MOCK        = !BASE_URL;

// Demo mode: forces mock data even when the real server is configured.
// Toggled by loginAsDemo / logout in RoleContext.
let _demoActive = false;
export const setDemoMode = (active) => { _demoActive = active; };
const isMock = () => MOCK || _demoActive;

const TOKEN_KEY = 'iifsa_token';

export const getStoredToken  = ()  => localStorage.getItem(TOKEN_KEY);
export const setStoredToken  = (t) => t
  ? localStorage.setItem(TOKEN_KEY, t)
  : localStorage.removeItem(TOKEN_KEY);

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// ── Token refresh (real mode only) ──────────────────────────────────────────
let _refreshing = null;

async function tryRefresh() {
  if (_refreshing) return _refreshing;
  _refreshing = fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((r) => { if (!r.ok) throw new Error('refresh_failed'); return r.json(); })
    .then(({ accessToken }) => { setStoredToken(accessToken); return accessToken; })
    .catch((err) => { setStoredToken(null); throw err; })
    .finally(() => { _refreshing = null; });
  return _refreshing;
}

// ── Core fetch helper ────────────────────────────────────────────────────────
const live = async (url, options = {}) => {
  const token = getStoredToken();
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let res = await fetch(`${BASE_URL}${url}`, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    try {
      const newToken = await tryRefresh();
      res = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
        credentials: 'include',
      });
    } catch {
      setStoredToken(null);
      window.location.replace('/login');
      throw new Error('Session expired. Please sign in again.');
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function login({ credential, password }) {
  if (isMock()) {
    await delay(600);
    const cred = credential.toLowerCase();
    const user = mockUsers.find(
      (u) => (u.email.toLowerCase() === cred || u.username === credential) && u.password === password
    );
    if (!user) throw new Error('Invalid email/username or password.');
    const { password: _pw, ...safeUser } = user;
    // Return same shape as real server so RoleContext doesn't need to know about MOCK
    return { accessToken: null, user: safeUser };
  }
  return live('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ credential, password }),
  });
}

export async function demoLogin(role) {
  await delay(500);
  const user = mockUsers.find((u) => u.role === role);
  if (!user) throw new Error(`No demo user for role: ${role}`);
  const { password: _, ...safeUser } = user;
  setDemoMode(true);
  return { accessToken: null, user: { ...safeUser, _isDemo: true } };
}

export async function logout() {
  if (isMock()) { await delay(200); return; }
  return live('/api/auth/logout', { method: 'POST' });
}

export async function authMe() {
  if (isMock()) return null; // Mock session is kept in localStorage by RoleContext
  return live('/api/auth/me');
}

export async function forgotPassword(email) {
  if (isMock()) { await delay(600); return { ok: true }; }
  return live('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token, password) {
  if (isMock()) { await delay(600); return { ok: true }; }
  return live('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

// ── Invite flow ───────────────────────────────────────────────────────────────

export async function getInvite(token) {
  if (isMock()) {
    await delay(400);
    return { id: 'u_new', name: 'New User', email: 'new@store.co.ke', role: 'operational' };
  }
  return live(`/api/users/invite/${token}`);
}

export async function acceptInvite(token, { password, username }) {
  if (isMock()) { await delay(800); return { ok: true }; }
  return live(`/api/users/invite/${token}/accept`, {
    method: 'POST',
    body: JSON.stringify({ password, username }),
  });
}

// ── Overview ──────────────────────────────────────────────────────────────────

export async function getSummary(period = '30d') {
  if (isMock()) { await delay(); return mockSummary; }
  return live(`/api/summary?period=${period}`);
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export async function getInventory() {
  if (isMock()) { await delay(); return mockInventory; }
  return live('/api/inventory');
}

export async function adjustInventory(productId, newStock, reason) {
  if (isMock()) { await delay(200); return { ok: true }; }
  return live(`/api/inventory/${productId}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ newStock, reason }),
  });
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function getAlerts(status = 'active') {
  if (isMock()) {
    await delay();
    return status === 'all' ? mockAlerts : mockAlerts.filter((a) => !a.resolved);
  }
  return live(`/api/alerts?status=${status}`);
}

export async function resolveAlert(alertId) {
  if (isMock()) { await delay(200); return { ok: true }; }
  return live(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
}

// ── Sales Analytics ───────────────────────────────────────────────────────────

export async function getSales(from, to, granularity = 'monthly') {
  if (isMock()) { await delay(); return mockSales(from, to, granularity); }

  const [monthlyRaw, productRaw] = await Promise.all([
    live('/api/analytics/sales-by-month'),
    live('/api/analytics/sales-by-product'),
  ]);

  const series = (monthlyRaw.monthly_trend || []).map(row => ({
    date:    `${row.year}-${String(row.month_number).padStart(2, '0')}-01`,
    revenue: Number(row.total_revenue),
    units:   Number(row.total_units),
  }));

  const byProduct = (productRaw.sales_by_product || []).map(row => ({
    productId: row.product_line,
    name:      row.product_line,
    category:  row.product_line,
    revenue:   Number(row.total_revenue),
    units:     Number(row.total_units),
    growthPct: 0,
  }));

  return { series, byProduct };
}

// ── Forecasts ─────────────────────────────────────────────────────────────────

export { PRODUCT_LINES };

export async function getForecast(productLine) {
  if (isMock()) { await delay(); return mockForecast(productLine); }

  const res = await fetch(`${FORECAST_URL}/api/forecast/${encodeURIComponent(productLine)}/`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  const raw = await res.json();

  const today = new Date();
  const forecast = raw.predictions.map((val, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i + 1);
    const predicted = +val.toFixed(2);
    return {
      date:      d.toISOString().slice(0, 10),
      predicted,
      lower:     +(predicted * 0.85).toFixed(2),
      upper:     +(predicted * 1.15).toFixed(2),
    };
  });

  return {
    productLine: raw.product_line,
    model:       raw.best_model,
    metrics: {
      mae:   +raw.metrics.MAE.toFixed(2),
      rmse:  +raw.metrics.RMSE.toFixed(2),
      smape: +raw.metrics.SMAPE.toFixed(2),
    },
    history: [],
    forecast,
  };
}

// ── Model Insights ────────────────────────────────────────────────────────────

export async function getModelsComparison() {
  if (isMock()) { await delay(); return mockModelsComparison; }

  const results = await Promise.all(
    PRODUCT_LINES.map(line =>
      fetch(`${FORECAST_URL}/api/forecast/${encodeURIComponent(line)}/`)
        .then(r => r.json())
    )
  );

  return results.map(raw => ({
    productId:     raw.product_line,
    name:          raw.product_line,
    selectedModel: raw.best_model,
    candidates:    Object.entries(raw.all_models).map(([model, score]) => ({
      model,
      score: +score.toFixed(2),
    })),
    metrics: {
      mae:   +raw.metrics.MAE.toFixed(2),
      rmse:  +raw.metrics.RMSE.toFixed(2),
      smape: +raw.metrics.SMAPE.toFixed(2),
    },
  }));
}

// ── Reorder & POs ─────────────────────────────────────────────────────────────

export async function getReorderSuggestions() {
  if (isMock()) { await delay(); return mockReorderSuggestions; }
  return live('/api/reorder/suggestions');
}

export async function getPurchaseOrders() {
  if (isMock()) { await delay(); return mockPurchaseOrders; }
  return live('/api/purchase-orders');
}

export async function createPurchaseOrder(order) {
  if (isMock()) { await delay(300); return { poId: 'po_new', ...order, status: 'pending' }; }
  return live('/api/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

// ── Users / Admin ─────────────────────────────────────────────────────────────

export async function getUsers() {
  if (isMock()) {
    await delay();
    // Normalize userId → id for consistency with the real server response shape
    return mockUsers.map(({ userId, password: _pw, ...rest }) => ({ id: userId, ...rest }));
  }
  return live('/api/users');
}

export async function inviteUser(data) {
  if (isMock()) { await delay(800); return { ok: true }; }
  return live('/api/users/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function changeUserRole(id, role) {
  if (isMock()) { await delay(200); return { ok: true }; }
  return live(`/api/users/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function deactivateUser(id) {
  if (isMock()) { await delay(200); return { ok: true }; }
  return live(`/api/users/${id}/deactivate`, { method: 'PUT' });
}

// ── Setup & onboarding ────────────────────────────────────────────────────────

export async function checkSetupStatus() {
  if (isMock()) return { initialized: true, isPublicInstance: false };
  return live('/api/setup/status');
}

export async function initializeSystem(data) {
  if (isMock()) { await delay(1000); return { ok: true }; }
  return live('/api/setup', { method: 'POST', body: JSON.stringify(data) });
}

export async function submitAccessRequest(data) {
  if (isMock()) { await delay(800); return { ok: true }; }
  return live('/api/requests', { method: 'POST', body: JSON.stringify(data) });
}

export async function getApprovalDetails(id, key) {
  if (isMock()) {
    await delay(400);
    return {
      id, business_name: 'Demo Corp Ltd', name: 'Demo User',
      email: 'demo@corp.co.ke', phone: '0712 000 000',
      message: 'Looking forward to using InvenSight for our retail operations.',
      status: 'pending', created_at: Math.floor(Date.now() / 1000) - 3600,
    };
  }
  return live(`/api/requests/${id}/details?key=${encodeURIComponent(key)}`);
}

export async function approveRequest(id, key) {
  if (isMock()) { await delay(600); return { ok: true }; }
  return live(`/api/requests/${id}/approve?key=${encodeURIComponent(key)}`, { method: 'POST' });
}
