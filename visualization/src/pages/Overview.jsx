import { useEffect, useState, useMemo } from 'react';
import { useGlobalFilter, DATE_RANGE_OPTIONS } from '../context/GlobalFilterContext';
import { getSummary } from '../api/api';
import { SkeletonCard, ErrorState, EmptyState } from '../components/ui/States';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { MdInventory2, MdWarning, MdErrorOutline, MdAttachMoney, MdNotifications, MdTrendingUp, MdTrendingDown } from 'react-icons/md';
import './Overview.css';

const KPI_CONFIG = [
  { key: 'totalSkus',        label: 'Total SKUs',         icon: MdInventory2,    color: 'var(--color-primary)' },
  { key: 'lowStock',         label: 'Low Stock',          icon: MdWarning,       color: 'var(--color-warning)' },
  { key: 'outOfStock',       label: 'Out of Stock',       icon: MdErrorOutline,  color: 'var(--color-critical)' },
  { key: 'revenue',          label: 'Revenue (30d)',       icon: MdAttachMoney,   color: 'var(--color-ok)', format: 'currency' },
  { key: 'openAlerts',       label: 'Open Alerts',        icon: MdNotifications, color: 'var(--color-critical)' },
];

const HEALTH_COLORS = {
  ok:       'var(--color-ok)',
  warning:  'var(--color-warning)',
  critical: 'var(--color-critical)',
};

function fmt(value, format, currency = 'KES') {
  if (format === 'currency') return `${currency} ${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
}

const ICON_BG = {
  'var(--color-primary)':  '#eff6ff',
  'var(--color-warning)':  '#fffbeb',
  'var(--color-critical)': '#fef2f2',
  'var(--color-ok)':       '#f0fdf4',
};

function KpiCard({ label, value, icon: Icon, color, format, currency, prevValue }) {
  const pct = prevValue ? (((value - prevValue) / prevValue) * 100).toFixed(1) : null;
  const up = pct > 0;
  return (
    <div className="kpi-card card">
      <div className="kpi-icon" style={{ background: ICON_BG[color] || '#f1f5f9', color }}>
        <Icon />
      </div>
      <div className="kpi-body">
        <div className="kpi-value">{fmt(value, format, currency)}</div>
        <div className="kpi-label">{label}</div>
        {pct !== null && (
          <div className={`kpi-delta ${up ? 'up' : 'down'}`}>
            {up ? <MdTrendingUp /> : <MdTrendingDown />} {Math.abs(pct)}% vs prev period
          </div>
        )}
      </div>
    </div>
  );
}

export default function Overview() {
  const { dateRange, prefs } = useGlobalFilter();
  const currency = prefs?.currency ?? 'KES';
  const days = DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.days ?? 30;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getSummary()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const visibleTrend = useMemo(
    () => (data?.salesTrend ?? []).slice(-days),
    [data, days]
  );

  if (loading) return (
    <div className="page">
      <div className="page-title">Overview</div>
      <div className="kpi-grid">{Array.from({length:5}).map((_,i)=><SkeletonCard key={i} rows={2}/>)}</div>
      <div className="overview-charts"><SkeletonCard rows={5}/><SkeletonCard rows={5}/></div>
    </div>
  );

  if (error) return <div className="page"><ErrorState message={error} onRetry={load} /></div>;
  if (!data)  return <div className="page"><EmptyState title="No data available" /></div>;

  const { kpis, stockHealth, topMovers } = data;

  const healthPie = [
    { name: 'OK',       value: stockHealth.ok,       key: 'ok'       },
    { name: 'Warning',  value: stockHealth.warning,  key: 'warning'  },
    { name: 'Critical', value: stockHealth.critical, key: 'critical' },
  ];

  return (
    <div className="page">
      <div className="page-title">Overview</div>

      <div className="kpi-grid">
        {KPI_CONFIG.map(({ key, label, icon, color, format }) => (
          <KpiCard
            key={key}
            label={label}
            value={kpis[key]}
            icon={icon}
            color={color}
            format={format}
            currency={currency}
            prevValue={key === 'revenue' ? kpis.revenuePrevPeriod : undefined}
          />
        ))}
      </div>

      <div className="overview-charts">
        {/* Sales sparkline */}
        <div className="card chart-card">
          <div className="chart-card-title">Sales Trend - {DATE_RANGE_OPTIONS.find(o=>o.value===dateRange)?.label}</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={visibleTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => [`KES ${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stock health donut */}
        <div className="card chart-card">
          <div className="chart-card-title">Stock Health</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={healthPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                {healthPie.map((entry) => (
                  <Cell key={entry.key} fill={HEALTH_COLORS[entry.key]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: '.75rem' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top movers */}
        <div className="card movers-card">
          <div className="chart-card-title">Top Movers</div>
          <table className="movers-table">
            <thead>
              <tr><th>Product</th><th>Change</th></tr>
            </thead>
            <tbody>
              {topMovers.map((m) => (
                <tr key={m.productId}>
                  <td>{m.name}</td>
                  <td className={m.changePct >= 0 ? 'delta-up' : 'delta-down'}>
                    {m.changePct >= 0 ? '+' : ''}{m.changePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
