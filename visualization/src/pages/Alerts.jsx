import { useEffect, useState, useMemo } from 'react';
import { getAlerts, resolveAlert } from '../api/api';
import { SkeletonRows, EmptyState, ErrorState } from '../components/ui/States';
import { MdCheckCircle } from 'react-icons/md';
import './Alerts.css';

const TYPE_LABEL = { 'low-stock': 'Low Stock', anomaly: 'Anomaly' };

const SEVERITY_TABS = ['all', 'critical', 'warning'];
const TYPE_TABS     = ['all', 'low-stock', 'anomaly'];

export default function Alerts() {
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [showAll,  setShowAll]  = useState(false);
  const [severity, setSeverity] = useState('all');
  const [type,     setType]     = useState('all');

  const load = (all = showAll) => {
    setLoading(true); setError(null);
    getAlerts(all ? 'all' : 'active')
      .then(setAlerts)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(showAll); }, [showAll]); // eslint-disable-line

  const handleResolve = async (alertId) => {
    await resolveAlert(alertId);
    setAlerts(prev => prev.map(a => a.alertId === alertId ? { ...a, resolved: true } : a));
  };

  const filtered = useMemo(() => {
    let list = showAll ? alerts : alerts.filter(a => !a.resolved);
    if (severity !== 'all') list = list.filter(a => a.severity === severity);
    if (type     !== 'all') list = list.filter(a => a.type     === type);
    return list;
  }, [alerts, showAll, severity, type]);

  const counts = useMemo(() => {
    const base = showAll ? alerts : alerts.filter(a => !a.resolved);
    return {
      severity: {
        all:      base.length,
        critical: base.filter(a => a.severity === 'critical').length,
        warning:  base.filter(a => a.severity === 'warning').length,
      },
      type: {
        all:        base.length,
        'low-stock': base.filter(a => a.type === 'low-stock').length,
        anomaly:     base.filter(a => a.type === 'anomaly').length,
      },
    };
  }, [alerts, showAll]);

  return (
    <div className="page">
      <div className="alerts-header">
        <div className="page-title" style={{ marginBottom: 0 }}>Alerts</div>
        <label className="show-all-toggle">
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
          Show resolved
        </label>
      </div>

      <div className="alerts-filters">
        <div className="filter-group">
          <span className="filter-group-label">Severity</span>
          {SEVERITY_TABS.map(s => (
            <button
              key={s}
              className={`filter-chip${severity === s ? ' active' : ''}${s !== 'all' ? ` chip-${s}` : ''}`}
              onClick={() => setSeverity(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="chip-count">{counts.severity[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-group-label">Type</span>
          {TYPE_TABS.map(t => (
            <button
              key={t}
              className={`filter-chip${type === t ? ' active' : ''}`}
              onClick={() => setType(t)}
            >
              {t === 'all' ? 'All' : TYPE_LABEL[t]}
              <span className="chip-count">{counts.type[t] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card alerts-list-wrap">
        {loading ? <SkeletonRows count={6} /> :
         error   ? <ErrorState message={error} onRetry={() => load()} /> :
         filtered.length === 0
           ? <EmptyState title="No alerts" desc="No alerts match the current filters." />
           : filtered.map(a => (
            <div key={a.alertId} className={`alert-row${a.resolved ? ' resolved' : ''}`}>
              <div className={`alert-severity badge badge-${a.severity}`}>{a.severity}</div>
              <div className="alert-body">
                <div className="alert-product">{a.productName}</div>
                <div className="alert-msg">{a.message}</div>
                <div className="alert-meta">
                  <span className="alert-type">{TYPE_LABEL[a.type] || a.type}</span>
                  <span className="alert-time">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
              </div>
              {!a.resolved && (
                <button className="btn-resolve" onClick={() => handleResolve(a.alertId)}>
                  <MdCheckCircle /> Resolve
                </button>
              )}
              {a.resolved && <span className="resolved-tag">Resolved</span>}
            </div>
          ))}
      </div>
    </div>
  );
}
