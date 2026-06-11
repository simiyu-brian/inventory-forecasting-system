import { useEffect, useState } from 'react';
import { getSales } from '../api/api';
import { SkeletonCard, EmptyState, ErrorState } from '../components/ui/States';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import './SalesAnalytics.css';

export default function SalesAnalytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = () => {
    setLoading(true); setError(null);
    getSales().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="page">
      <div className="sa-header">
        <div className="page-title" style={{ marginBottom: 0 }}>Sales Analytics</div>
      </div>

      {loading ? <SkeletonCard rows={6} /> :
       error   ? <ErrorState message={error} onRetry={() => load()} /> :
       !data   ? <EmptyState title="No sales data" /> :
      <>
        <div className="card chart-card" style={{ marginBottom: '.875rem' }}>
          <div className="chart-card-title">Revenue & Units</div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data.series} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }}
                tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', year: '2-digit' })}
                interval="preserveStartEnd" />
              <YAxis yAxisId="rev" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="units" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="rev" dataKey="revenue" fill="var(--color-primary)" opacity={.8} name="Revenue (KES)" />
              <Line yAxisId="units" type="monotone" dataKey="units" stroke="var(--color-warning)" strokeWidth={2} dot={false} name="Units" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="card sa-table-wrap">
          <div className="chart-card-title">Product Performance</div>
          <table className="sa-table">
            <thead>
              <tr><th>Product</th><th>Category</th><th>Revenue</th><th>Units</th><th>Growth</th></tr>
            </thead>
            <tbody>
              {[...data.byProduct].sort((a,b) => b.revenue - a.revenue).map(p => (
                <tr key={p.productId}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>KES {p.revenue.toLocaleString()}</td>
                  <td>{p.units}</td>
                  <td className={p.growthPct >= 0 ? 'delta-up' : 'delta-down'}>
                    {p.growthPct >= 0 ? '+' : ''}{p.growthPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
    </div>
  );
}
