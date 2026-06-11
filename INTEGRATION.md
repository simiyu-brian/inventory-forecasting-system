# Integration Contract

This document is the guide source of the relation between the dashboard frontend and the backend modules (analytics and foreshadowing).

Every shape below is copied directly from the frontend adapter layer (`visualization/src/api/api.js` + `mockData.js`). Build your endpoints to match these exactly and the frontend will match up.

**Base URL:** `http://localhost:4000` in development. Production URL TBD.  
**Auth:** All endpoints except `/api/auth/*` require `Authorization: Bearer <accessToken>` in the request header.  
**Content-Type:** `application/json` for all request and response bodies.

---

## Simiyu - Database & ETL

### `GET /api/summary?period=30d`

`period` is a string hint (`7d`, `30d`, `90d`). Use it to scope `salesTrend` and KPI comparisons.

```json
{
  "kpis": {
    "totalSkus": 248,
    "lowStock": 17,
    "outOfStock": 4,
    "revenue": 1420500,
    "revenuePrevPeriod": 1210300,
    "openAlerts": 9
  },
  "stockHealth": {
    "ok": 227,
    "warning": 17,
    "critical": 4
  },
  "salesTrend": [
    { "date": "2026-05-01", "value": 42300 },
    { "date": "2026-05-02", "value": 38900 }
  ],
  "topMovers": [
    { "productId": "p1", "name": "Unga Jogoo 2kg",      "changePct": 18.4  },
    { "productId": "p2", "name": "Brookside Milk 500ml", "changePct": 12.1  },
    { "productId": "p3", "name": "Royco Mchuzi Mix",     "changePct": -8.7  }
  ]
}
```

- `salesTrend` - one entry per day covering the requested period
- `changePct` - positive = growing, negative = declining vs previous equivalent period
- `revenue` / `revenuePrevPeriod` - KES, raw numbers (no formatting)

---

### `GET /api/inventory`

Returns all products. No query params.

```json
[
  {
    "productId": "p1",
    "name": "Unga Jogoo 2kg",
    "category": "Grains",
    "stock": 12,
    "reorderPoint": 20,
    "warehouse": "Main",
    "supplierName": "Unga Ltd",
    "leadTimeDays": 3
  }
]
```

- `stock` - current on-hand quantity
- `reorderPoint` - the threshold at which an alert fires
- `warehouse` - name string matching your warehouses table

---

### `POST /api/inventory/:productId/adjust`

Manual stock adjustment by a user.

**Request body:**
```json
{ "newStock": 45, "reason": "Stock count correction" }
```

**Response:**
```json
{ "ok": true }
```

---

### `GET /api/alerts?status=active`

`status` is either `active` (open alerts only) or `all` (include resolved).

```json
[
  {
    "alertId": "a1",
    "productId": "p3",
    "productName": "Royco Mchuzi Mix",
    "type": "low-stock",
    "severity": "critical",
    "message": "Stock (3) below reorder point (15)",
    "createdAt": "2026-05-27T08:15:00Z",
    "resolved": false
  }
]
```

- `type` - `"low-stock"` | `"anomaly"` | `"expiry"` (extend as needed)
- `severity` - `"warning"` | `"critical"`
- `resolved` - boolean

---

### `POST /api/alerts/:alertId/resolve`

No request body required.

**Response:**
```json
{ "ok": true }
```

---

### `GET /api/sales?from=2026-04-01&to=2026-05-01&granularity=daily`

- `from` / `to` - ISO date strings (`YYYY-MM-DD`)
- `granularity` - `"daily"` | `"weekly"` | `"monthly"`

```json
{
  "series": [
    { "date": "2026-04-01", "revenue": 52400, "units": 180 },
    { "date": "2026-04-02", "revenue": 47800, "units": 155 }
  ],
  "byProduct": [
    {
      "productId": "p1",
      "name": "Unga Jogoo 2kg",
      "category": "Grains",
      "revenue": 183400,
      "units": 412,
      "growthPct": 14.2
    }
  ]
}
```

- `series` - time-series for the revenue chart, bucketed by granularity
- `byProduct` - one row per product for the breakdown table
- `growthPct` - vs equivalent previous period, signed float

---

### `GET /api/reorder/suggestions`

Products that are at or below reorder point, with an EOQ-based suggested order quantity.

```json
[
  {
    "productId": "p1",
    "name": "Unga Jogoo 2kg",
    "currentStock": 12,
    "reorderPoint": 20,
    "suggestedQty": 100,
    "supplierName": "Unga Ltd"
  }
]
```

---

### `GET /api/purchase-orders`

All purchase orders, any status.

```json
[
  {
    "poId": "po1",
    "productId": "p2",
    "productName": "Brookside Milk 500ml",
    "supplierName": "Brookside",
    "qty": 200,
    "status": "pending",
    "expectedDate": "2026-06-01"
  }
]
```

- `status` - `"pending"` | `"confirmed"` | `"shipped"` | `"received"`
- `expectedDate` - ISO date string

---

### `POST /api/purchase-orders`

Create a new purchase order from the reorder screen.

**Request body:**
```json
{
  "productId": "p1",
  "supplierName": "Unga Ltd",
  "qty": 100,
  "expectedDate": "2026-06-07"
}
```

**Response:**
```json
{
  "poId": "po_abc123",
  "productId": "p1",
  "supplierName": "Unga Ltd",
  "qty": 100,
  "status": "pending",
  "expectedDate": "2026-06-07"
}
```

---

## Dave - Forecasting & ML

### `GET /api/forecasts/:productId?horizon=30`

- `productId` - matches the `productId` values from `/api/inventory`
- `horizon` - number of days to forecast ahead (default 30)

```json
{
  "productId": "p1",
  "model": "Prophet",
  "metrics": {
    "mae": 8.2,
    "rmse": 11.4,
    "mape": 9.7
  },
  "history": [
    { "date": "2026-03-01", "actual": 95 },
    { "date": "2026-03-02", "actual": 88 }
  ],
  "forecast": [
    { "date": "2026-05-31", "predicted": 102, "lower": 87, "upper": 119 },
    { "date": "2026-06-01", "predicted": 98,  "lower": 83, "upper": 115 }
  ]
}
```

- `model` - name of the model selected for this product (shown as a label in the UI)
- `metrics` - error metrics for the selected model. All three are displayed.
- `history` - ~60 days of actuals for the chart backdrop. More is fine.
- `forecast[].lower` / `upper` - confidence band bounds. **Required** - the chart renders a shaded band. If your model only produces point estimates, set `lower = predicted * 0.85` and `upper = predicted * 1.15` as a fallback so the UI degrades gracefully.

---

### `GET /api/models/comparison`

One entry per product showing which model was selected and why (all candidates ranked).

```json
[
  {
    "productId": "p1",
    "name": "Unga Jogoo 2kg",
    "selectedModel": "Prophet",
    "candidates": [
      { "model": "Naïve",         "mae": 17.3, "rmse": 21.1, "mape": 15.8 },
      { "model": "ARIMA",         "mae": 12.4, "rmse": 15.6, "mape": 11.2 },
      { "model": "Prophet",       "mae": 8.2,  "rmse": 11.4, "mape": 9.7  },
      { "model": "Random Forest", "mae": 9.8,  "rmse": 12.9, "mape": 10.4 },
      { "model": "XGBoost",       "mae": 9.1,  "rmse": 12.2, "mape": 9.9  }
    ]
  }
]
```

- `selectedModel` - must match one of the `model` strings in `candidates`
- `candidates` - include all models you evaluated, even poor performers. The UI renders a comparison table so the selection reasoning is visible.
- All metric values are floats rounded to 2 decimal places.

---

## Field naming rules

| Rule | Example |
|---|---|
| IDs are camelCase strings | `productId`, `alertId`, `poId` |
| Dates are ISO 8601 strings | `"2026-05-30"` or `"2026-05-30T08:00:00Z"` |
| Money is raw KES numbers | `1420500` not `"KES 1,420,500"` |
| Percentages are signed floats | `14.2` not `"14.2%"` |
| Booleans are actual booleans | `false` not `"false"` or `0` |

## Error format

Return errors in this shape so the frontend error states display the message correctly:

```json
{ "error": "Human-readable message here." }
```

HTTP status codes: `400` bad input, `401` unauthenticated, `403` forbidden, `404` not found, `500` server error.
