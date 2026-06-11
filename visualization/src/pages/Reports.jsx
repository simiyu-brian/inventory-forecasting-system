import { useGlobalFilter } from '../context/GlobalFilterContext';
import { MdDownload, MdTableChart, MdTrendingUp, MdInventory2 } from 'react-icons/md';
import './Reports.css';

function toCSV(rows) {
  return rows.map(r =>
    r.map(cell => (String(cell).includes(',') ? `"${cell}"` : cell)).join(',')
  ).join('\n');
}

function downloadCSV(filename, rows) {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function statusOf(stock, reorderPoint, buffer = 30) {
  if (stock === 0)                                    return 'Out of Stock';
  if (stock <= reorderPoint)                          return 'Critical';
  if (stock <= reorderPoint * (1 + buffer / 100))    return 'Warning';
  return 'OK';
}

export default function Reports() {
  const { allProducts, allAlerts, prefs, warehouse, category } = useGlobalFilter();
  const buffer = prefs?.warningBuffer ?? 30;
  const currency = prefs?.currency ?? 'KES';

  const filteredProducts = allProducts
    .filter(p => warehouse === 'all' || p.warehouse === warehouse)
    .filter(p => category  === 'all' || p.category  === category);

  const exportInventory = () => {
    const rows = [
      ['Product', 'Category', 'Warehouse', 'Stock', 'Reorder Point', 'Status', 'Supplier', 'Lead Time (days)'],
      ...filteredProducts.map(p => [
        p.name, p.category, p.warehouse, p.stock, p.reorderPoint,
        statusOf(p.stock, p.reorderPoint, buffer), p.supplierName, p.leadTimeDays,
      ]),
    ];
    downloadCSV('stock_status_report.csv', rows);
  };

  const exportAlerts = () => {
    const rows = [
      ['Alert ID', 'Product', 'Type', 'Severity', 'Message', 'Created At', 'Status'],
      ...allAlerts.map(a => [
        a.alertId, a.productName, a.type, a.severity, a.message,
        new Date(a.createdAt).toLocaleString(), a.resolved ? 'Resolved' : 'Active',
      ]),
    ];
    downloadCSV('alerts_report.csv', rows);
  };

  const exportSalesSummary = () => {
    // Builds from allProducts revenue proxy - real data will come from Brian's endpoint
    const rows = [
      ['Product', 'Category', 'Warehouse', 'Est. Revenue', 'Est. Units'],
      ...filteredProducts.map(p => [
        p.name, p.category, p.warehouse,
        `${currency} ${(p.stock * 150).toLocaleString()}`,
        p.stock,
      ]),
    ];
    downloadCSV('sales_summary_report.csv', rows);
  };

  const TEMPLATES = [
    {
      id: 'inventory',
      label: 'Stock Status Report',
      icon: MdInventory2,
      desc: `Current inventory levels, reorder flags, and supplier info. ${filteredProducts.length} products (current filter).`,
      action: exportInventory,
    },
    {
      id: 'alerts',
      label: 'Alerts Report',
      icon: MdTableChart,
      desc: `All ${allAlerts.length} alerts with severity, type, and resolution status.`,
      action: exportAlerts,
    },
    {
      id: 'sales',
      label: 'Sales Summary',
      icon: MdTrendingUp,
      desc: 'Revenue and units per product. Full data available once Sales Analytics backend is connected.',
      action: exportSalesSummary,
    },
  ];

  return (
    <div className="page">
      <div className="page-title">Reports &amp; Export</div>
      <div className="reports-grid">
        {TEMPLATES.map(({ id, label, icon: Icon, desc, action }) => (
          <div key={id} className="card report-card">
            <div className="report-icon"><Icon /></div>
            <div className="report-body">
              <div className="report-label">{label}</div>
              <div className="report-desc">{desc}</div>
            </div>
            <button className="btn-download" onClick={action}>
              <MdDownload /> CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
