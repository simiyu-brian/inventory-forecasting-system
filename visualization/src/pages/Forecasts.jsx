import { useEffect, useState } from 'react';
import { getForecast, PRODUCT_LINES } from '../api/api';
import { ErrorState } from '../components/ui/States';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { MdTrendingUp, MdTrendingDown, MdTrendingFlat } from 'react-icons/md';
import './Forecasts.css';

// ── helpers ───────────────────────────────────────────────────────────────────

const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;

function getTrend(preds) {
  if (preds.length < 2) return 'stable';
  const mid   = Math.floor(preds.length / 2);
  const delta = (avg(preds.slice(mid)) - avg(preds.slice(0, mid))) / avg(preds.slice(0, mid));
  if (delta >  0.05) return 'up';
  if (delta < -0.05) return 'down';
  return 'stable';
}

function getConfidence(smape) {
  if (smape <= 20) return { label: 'High',     cls: 'conf-high'     };
  if (smape <= 40) return { label: 'Moderate', cls: 'conf-moderate' };
  return              { label: 'Low',      cls: 'conf-low'      };
}

const dayShort = (iso) => new Date(iso).toLocaleDateString('en-KE', { weekday: 'short' });
const dayLong  = (iso) => new Date(iso).toLocaleDateString('en-KE', { weekday: 'long'  });

function peakDay(forecast) {
  return dayLong(forecast.reduce((a, b) => b.predicted > a.predicted ? b : a).date);
}

const TREND = {
  up:     { icon: <MdTrendingUp />,   cls: 'trend-up',     label: 'Trending up'   },
  down:   { icon: <MdTrendingDown />, cls: 'trend-down',   label: 'Trending down' },
  stable: { icon: <MdTrendingFlat />, cls: 'trend-stable', label: 'Stable demand' },
};

// ── sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ values, trend }) {
  if (!values?.length) return null;
  const W = 84, H = 30, pad = 3;
  const lo = Math.min(...values), hi = Math.max(...values), range = hi - lo || 1;
  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (W - pad * 2),
    pad + (1 - (v - lo) / range) * (H - pad * 2),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const fill = `${line} L${pts.at(-1)[0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  const color = trend === 'up' ? 'var(--color-ok)' : trend === 'down' ? 'var(--color-critical)' : 'var(--color-primary)';
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <path d={fill} fill={color} fillOpacity={0.15} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Forecasts() {
  const [allData,  setAllData]  = useState({});
  const [selected, setSelected] = useState(PRODUCT_LINES[0]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    Promise.all(PRODUCT_LINES.map(line => getForecast(line).then(d => [line, d])))
      .then(entries => setAllData(Object.fromEntries(entries)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const data       = allData[selected];
  const preds      = data?.forecast.map(f => f.predicted) ?? [];
  const avgDemand  = preds.length ? Math.round(avg(preds))         : 0;
  const minDemand  = preds.length ? Math.round(Math.min(...preds)) : 0;
  const maxDemand  = preds.length ? Math.round(Math.max(...preds)) : 0;
  const trend      = getTrend(preds);
  const trendInfo  = TREND[trend];
  const confidence = data ? getConfidence(data.metrics.smape) : null;

  const chartData = data?.forecast.map(f => ({
    day:       dayShort(f.date),
    Forecast:  Math.round(f.predicted),
    lower:     Math.round(f.lower),
    upper:     Math.round(f.upper),
  })) ?? [];

  if (error) return (
    <div className="page">
      <div className="page-title">Forecasts</div>
      <ErrorState message={error} onRetry={() => window.location.reload()} />
    </div>
  );

  return (
    <div className="page">
      <div className="fc-header">
        <div className="page-title" style={{ marginBottom: 0 }}>Forecasts</div>
        {loading && <span className="fc-loading-hint">Loading all forecasts…</span>}
      </div>

      {/* ── Overview cards ── */}
      <div className="fc-cards">
        {PRODUCT_LINES.map(line => {
          const d     = allData[line];
          const lPreds = d?.forecast.map(f => f.predicted) ?? [];
          const t     = getTrend(lPreds);
          const ti    = TREND[t];
          const a     = lPreds.length ? Math.round(avg(lPreds)) : null;

          return (
            <button
              key={line}
              className={`fc-card${selected === line ? ' fc-card-active' : ''}`}
              onClick={() => setSelected(line)}
            >
              <div className="fc-card-name">{line}</div>
              {d ? (
                <>
                  <div className="fc-card-avg">
                    <span className="fc-card-num">{a?.toLocaleString()}</span>
                    <span className="fc-card-unit"> avg/day</span>
                  </div>
                  <div className={`fc-card-trend ${ti.cls}`}>{ti.icon}{ti.label}</div>
                  <Sparkline values={lPreds} trend={t} />
                </>
              ) : (
                <div className="fc-card-shimmer" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Detail panel ── */}
      {data && (
        <div className="card fc-detail">
          {/* Header */}
          <div className="fc-detail-header">
            <div>
              <div className="fc-detail-title">{selected}</div>
              <p className="fc-summary">
                Expecting approximately <strong>{avgDemand.toLocaleString()} units/day</strong> over
                the next {data.forecast.length} days, with demand peaking on <strong>{peakDay(data.forecast)}</strong>.
              </p>
            </div>
            <span className={`fc-trend-pill ${trendInfo.cls}`}>
              {trendInfo.icon} {trendInfo.label}
            </span>
          </div>

          {/* Stat cards */}
          <div className="fc-stats">
            <div className="fc-stat">
              <div className="fc-stat-label">Avg. Daily Demand</div>
              <div className="fc-stat-val">{avgDemand.toLocaleString()}</div>
            </div>
            <div className="fc-stat">
              <div className="fc-stat-label">Demand Range</div>
              <div className="fc-stat-val">{minDemand.toLocaleString()} – {maxDemand.toLocaleString()}</div>
            </div>
            <div className="fc-stat">
              <div className="fc-stat-label">Forecast Confidence</div>
              <div className={`fc-stat-val ${confidence.cls}`}>{confidence.label}</div>
            </div>
          </div>

          {/* Chart */}
          <div className="fc-chart-title">
            Daily Demand Forecast
            <span className="fc-range-label"> -shaded band shows likely range</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => v.toLocaleString()} />
              <ReferenceLine
                y={avgDemand}
                stroke="var(--color-text-muted)"
                strokeDasharray="4 2"
                label={{ value: 'Avg', position: 'insideTopRight', fontSize: 10, fill: 'var(--color-text-muted)' }}
              />
              <Area type="monotone" dataKey="upper" fill="var(--color-primary)" stroke="transparent" fillOpacity={0.10} legendType="none" />
              <Area type="monotone" dataKey="lower" fill="var(--color-surface)"  stroke="transparent" fillOpacity={1}    legendType="none" />
              <Line
                type="monotone"
                dataKey="Forecast"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ r: 5, fill: 'var(--color-primary)', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="fc-footnote">
            AI-powered forecast · Best model: {data.model} · Accuracy indicator based on SMAPE ({data.metrics.smape}%)
          </div>
        </div>
      )}
    </div>
  );
}
