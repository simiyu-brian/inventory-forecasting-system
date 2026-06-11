// Mock data returning the proposed JSON shapes from the SOW.
// All shapes here mirror exactly what the real endpoints will return.

export const mockAuthMe = {
  userId: 'u1',
  name: 'Julius Njenga',
  role: 'management', // 'operational' | 'analytical' | 'management'
};

export const mockSummary = {
  kpis: {
    totalSkus: 248,
    lowStock: 17,
    outOfStock: 4,
    revenue: 1_420_500,
    revenuePrevPeriod: 1_210_300,
    openAlerts: 9,
  },
  stockHealth: { ok: 227, warning: 17, critical: 4 },
  salesTrend: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
    value: 30000 + Math.round(Math.random() * 20000),
  })),
  topMovers: [
    { productId: 'p1', name: 'Unga Jogoo 2kg', changePct: 18.4 },
    { productId: 'p2', name: 'Brookside Milk 500ml', changePct: 12.1 },
    { productId: 'p3', name: 'Royco Mchuzi Mix', changePct: -8.7 },
    { productId: 'p4', name: 'Ketepa Tea 50g', changePct: -14.2 },
    { productId: 'p5', name: 'Blue Band 250g', changePct: 6.3 },
  ],
};

export const mockInventory = [
  { productId: 'p1',  name: 'Unga Jogoo 2kg',       category: 'Grains',     stock: 12,  reorderPoint: 20,  warehouse: 'Main',    supplierName: 'Unga Ltd',       leadTimeDays: 3 },
  { productId: 'p2',  name: 'Brookside Milk 500ml',  category: 'Dairy',      stock: 45,  reorderPoint: 30,  warehouse: 'Main',    supplierName: 'Brookside',      leadTimeDays: 1 },
  { productId: 'p3',  name: 'Royco Mchuzi Mix',      category: 'Spices',     stock: 3,   reorderPoint: 15,  warehouse: 'Main',    supplierName: 'Unilever',       leadTimeDays: 5 },
  { productId: 'p4',  name: 'Ketepa Tea 50g',        category: 'Beverages',  stock: 80,  reorderPoint: 25,  warehouse: 'Branch1', supplierName: 'Ketepa Ltd',     leadTimeDays: 4 },
  { productId: 'p5',  name: 'Blue Band 250g',        category: 'Dairy',      stock: 0,   reorderPoint: 10,  warehouse: 'Main',    supplierName: 'Upfield',        leadTimeDays: 2 },
  { productId: 'p6',  name: 'Pembe Flour 2kg',       category: 'Grains',     stock: 55,  reorderPoint: 20,  warehouse: 'Branch1', supplierName: 'Pembe Group',    leadTimeDays: 3 },
  { productId: 'p7',  name: 'Nice & Lovely Lotion',  category: 'Personal',   stock: 22,  reorderPoint: 12,  warehouse: 'Main',    supplierName: 'Nice & Lovely',  leadTimeDays: 7 },
  { productId: 'p8',  name: 'Safaricom Airtime 50',  category: 'Telecom',    stock: 200, reorderPoint: 50,  warehouse: 'Main',    supplierName: 'Safaricom',      leadTimeDays: 1 },
  { productId: 'p9',  name: 'Omo Detergent 500g',    category: 'Household',  stock: 8,   reorderPoint: 18,  warehouse: 'Main',    supplierName: 'Unilever',       leadTimeDays: 5 },
  { productId: 'p10', name: 'Kenchic Chicken 1kg',   category: 'Meat',       stock: 6,   reorderPoint: 10,  warehouse: 'Branch1', supplierName: 'Kenchic',        leadTimeDays: 1 },
];

export const mockAlerts = [
  { alertId: 'a1', productId: 'p3',  productName: 'Royco Mchuzi Mix',    type: 'low-stock', severity: 'critical', message: 'Stock (3) below reorder point (15)',       createdAt: '2026-05-27T08:15:00Z', resolved: false },
  { alertId: 'a2', productId: 'p5',  productName: 'Blue Band 250g',      type: 'low-stock', severity: 'critical', message: 'Out of stock',                              createdAt: '2026-05-27T09:00:00Z', resolved: false },
  { alertId: 'a3', productId: 'p1',  productName: 'Unga Jogoo 2kg',      type: 'low-stock', severity: 'warning',  message: 'Stock (12) approaching reorder point (20)', createdAt: '2026-05-27T10:30:00Z', resolved: false },
  { alertId: 'a4', productId: 'p9',  productName: 'Omo Detergent 500g',  type: 'low-stock', severity: 'warning',  message: 'Stock (8) approaching reorder point (18)',  createdAt: '2026-05-27T11:00:00Z', resolved: false },
  { alertId: 'a5', productId: 'p10', productName: 'Kenchic Chicken 1kg', type: 'anomaly',   severity: 'warning',  message: 'Unusual sales spike detected (+340%)',      createdAt: '2026-05-26T14:00:00Z', resolved: false },
  { alertId: 'a6', productId: 'p2',  productName: 'Brookside Milk 500ml',type: 'anomaly',   severity: 'warning',  message: 'Sales dropped 60% vs same day last week',  createdAt: '2026-05-25T09:00:00Z', resolved: true  },
];

const makeSalesSeries = (from, to, granularity) => {
  const days = granularity === 'daily' ? 1 : granularity === 'weekly' ? 7 : 30;
  const count = granularity === 'daily' ? 30 : granularity === 'weekly' ? 12 : 6;
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(Date.now() - (count - 1 - i) * days * 86400000).toISOString().slice(0, 10),
    revenue: 40000 + Math.round(Math.random() * 30000),
    units: 120 + Math.round(Math.random() * 80),
  }));
};

export const mockSales = (from, to, granularity = 'daily') => ({
  series: makeSalesSeries(from, to, granularity),
  byProduct: mockInventory.map((p) => ({
    productId: p.productId,
    name: p.name,
    category: p.category,
    revenue: 50000 + Math.round(Math.random() * 200000),
    units: 100 + Math.round(Math.random() * 500),
    growthPct: parseFloat((Math.random() * 40 - 20).toFixed(1)),
  })),
});

export const PRODUCT_LINES = [
  'Food and beverages',
  'Health and beauty',
  'Electronic accessories',
  'Fashion accessories',
  'Sports and travel',
  'Home and lifestyle',
];

const MOCK_MODELS = ['Naive', 'Moving Average', 'ARIMA', 'SARIMA', 'XGBoost'];

export const mockForecast = (productLine) => {
  const today = new Date();
  const forecast = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i + 1);
    const predicted = 400 + Math.round(Math.random() * 300);
    return {
      date: d.toISOString().slice(0, 10),
      predicted,
      lower:  Math.round(predicted * 0.85),
      upper:  Math.round(predicted * 1.15),
    };
  });
  return {
    productLine,
    model:   MOCK_MODELS[Math.floor(Math.random() * MOCK_MODELS.length)],
    metrics: { mae: +(320 + Math.random() * 80).toFixed(2), rmse: +(400 + Math.random() * 80).toFixed(2), smape: +(28 + Math.random() * 10).toFixed(2) },
    history: [],
    forecast,
  };
};

export const mockModelsComparison = PRODUCT_LINES.map((line) => ({
  productId:     line,
  name:          line,
  selectedModel: MOCK_MODELS[Math.floor(Math.random() * MOCK_MODELS.length)],
  candidates: [
    { model: 'Naive',          score: +(4.5 + Math.random() * 0.3).toFixed(2) },
    { model: 'Moving Average', score: +(4.2 + Math.random() * 0.3).toFixed(2) },
    { model: 'ARIMA',          score: +(4.0 + Math.random() * 0.3).toFixed(2) },
    { model: 'SARIMA',         score: +(4.1 + Math.random() * 0.3).toFixed(2) },
    { model: 'XGBoost',        score: +(3.8 + Math.random() * 0.3).toFixed(2) },
  ],
  metrics: { mae: +(320 + Math.random() * 80).toFixed(2), rmse: +(400 + Math.random() * 80).toFixed(2), smape: +(28 + Math.random() * 10).toFixed(2) },
}));

export const mockReorderSuggestions = [
  { productId: 'p1', name: 'Unga Jogoo 2kg',      currentStock: 12, reorderPoint: 20, suggestedQty: 100, supplierName: 'Unga Ltd'    },
  { productId: 'p3', name: 'Royco Mchuzi Mix',    currentStock: 3,  reorderPoint: 15, suggestedQty: 60,  supplierName: 'Unilever'    },
  { productId: 'p5', name: 'Blue Band 250g',      currentStock: 0,  reorderPoint: 10, suggestedQty: 50,  supplierName: 'Upfield'     },
  { productId: 'p9', name: 'Omo Detergent 500g',  currentStock: 8,  reorderPoint: 18, suggestedQty: 80,  supplierName: 'Unilever'    },
  { productId: 'p10',name: 'Kenchic Chicken 1kg', currentStock: 6,  reorderPoint: 10, suggestedQty: 40,  supplierName: 'Kenchic'     },
];

export const mockPurchaseOrders = [
  { poId: 'po1', productId: 'p2', productName: 'Brookside Milk 500ml', supplierName: 'Brookside', qty: 200, status: 'pending',   expectedDate: '2026-06-01' },
  { poId: 'po2', productId: 'p4', productName: 'Ketepa Tea 50g',       supplierName: 'Ketepa Ltd',qty: 150, status: 'confirmed', expectedDate: '2026-05-30' },
  { poId: 'po3', productId: 'p6', productName: 'Pembe Flour 2kg',      supplierName: 'Pembe Group',qty: 120,status: 'shipped',   expectedDate: '2026-05-29' },
];

export const mockUsers = [
  {
    userId: 'u1', name: 'Julius Njenga', role: 'management',
    email: 'Julius@store.co.ke', username: 'julius', password: 'demo123',
    businessName: 'Julius Retail Ltd', businessReg: 'BN-2024-00123', phone: '0712345678',
  },
  {
    userId: 'u2', name: 'Alice Wanjiru', role: 'analytical',
    email: 'alice@store.co.ke', username: 'alice', password: 'demo123',
    department: 'Demand Planning',
  },
  {
    userId: 'u3', name: 'John Kamau', role: 'operational',
    email: 'john@store.co.ke', username: 'john', password: 'demo123',
    warehouse: 'Main',
  },
  {
    userId: 'u4', name: 'Grace Muthoni', role: 'operational',
    email: 'grace@store.co.ke', username: 'grace', password: 'demo123',
    warehouse: 'Branch1',
  },
];
