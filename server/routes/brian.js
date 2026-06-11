const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');

const BRIAN = () => process.env.BRIAN_URL || 'http://localhost:8001';

async function proxy(brianPath, req, res) {
  const qs  = new URLSearchParams(req.query).toString();
  const url = `${BRIAN()}${brianPath}${qs ? `?${qs}` : ''}`;
  try {
    const isWrite = req.method !== 'GET';
    const r = await fetch(url, {
      method:  req.method,
      signal:  AbortSignal.timeout(15000),
      ...(isWrite && {
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(req.body || {}),
      }),
    });
    const body = await r.json().catch(() => ({}));
    res.status(r.status).json(body);
  } catch {
    res.status(503).json({ error: 'Analytics service is currently unavailable.' });
  }
}

// ── Overview summary ──────────────────────────────────────────────────────────
router.get('/summary', requireAuth, (req, res) =>
  proxy('/api/v1/summary/', req, res));

// ── Inventory ─────────────────────────────────────────────────────────────────
router.get('/inventory',                    requireAuth, (req, res) => proxy('/api/v1/inventory/',              req, res));
router.post('/inventory/:productId/adjust', requireAuth, (req, res) => proxy(`/api/v1/inventory/${req.params.productId}/adjust`, req, res));

// ── Alerts ────────────────────────────────────────────────────────────────────
router.get('/alerts',                      requireAuth, (req, res) => proxy('/api/v1/alerts/',                     req, res));
router.post('/alerts/:alertId/resolve',    requireAuth, (req, res) => proxy(`/api/v1/alerts/${req.params.alertId}/resolve`, req, res));

// ── Reorder & Purchase Orders ─────────────────────────────────────────────────
router.get('/reorder/suggestions',  requireAuth, (req, res) => proxy('/api/v1/reorder/suggestions',       req, res));
router.get('/purchase-orders',      requireAuth, (req, res) => proxy('/api/v1/reorder/purchase-orders',   req, res));
router.post('/purchase-orders',     requireAuth, (req, res) => proxy('/api/v1/reorder/purchase-orders',   req, res));

// ── Analytics (analytical+ role) ─────────────────────────────────────────────
router.get('/analytics/sales-by-product',   requireAuth, requireRole('analytical'), (req, res) => proxy('/api/v1/analytics/sales-by-product',   req, res));
router.get('/analytics/sales-by-month',     requireAuth, requireRole('analytical'), (req, res) => proxy('/api/v1/analytics/sales-by-month',     req, res));
router.get('/analytics/sales-by-store',     requireAuth, requireRole('analytical'), (req, res) => proxy('/api/v1/analytics/sales-by-store',     req, res));
router.get('/analytics/sales-by-payment',   requireAuth, requireRole('analytical'), (req, res) => proxy('/api/v1/analytics/sales-by-payment',   req, res));
router.get('/analytics/sales-by-gender',    requireAuth, requireRole('analytical'), (req, res) => proxy('/api/v1/analytics/sales-by-gender',    req, res));
router.get('/analytics/top-products',       requireAuth, requireRole('analytical'), (req, res) => proxy('/api/v1/analytics/top-products',       req, res));
router.get('/analytics/weekend-vs-weekday', requireAuth, requireRole('analytical'), (req, res) => proxy('/api/v1/analytics/weekend-vs-weekday', req, res));

// ── Supply Risk (all authenticated roles) ────────────────────────────────────
router.get('/supply-risk/today',  requireAuth, (req, res) => proxy('/api/v1/supply-risk/today',  req, res));
router.get('/supply-risk/stats',  requireAuth, (req, res) => proxy('/api/v1/supply-risk/stats',  req, res));
router.get('/supply-risk/events', requireAuth, (req, res) => proxy('/api/v1/supply-risk/',        req, res));

// ── Transactions summary (management only) ───────────────────────────────────
router.get('/transactions/summary', requireAuth, requireRole('management'), (req, res) => proxy('/api/v1/transactions/summary', req, res));

module.exports = router;
