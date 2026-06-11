import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MdInventory2, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { useRole } from '../context/RoleContext';
import './Login.css';

const DEMO_ROLES = [
  { role: 'management',  label: 'Management',  color: '#6d28d9', desc: 'Full access - KPIs, forecasts, admin' },
  { role: 'analytical',  label: 'Analytical',  color: '#1d4ed8', desc: 'Sales analytics, forecasts, reports' },
  { role: 'operational', label: 'Operational', color: '#065f46', desc: 'Inventory, alerts, stock tasks' },
];

export default function Login({ isPublicInstance = false, initialized = true }) {
  const { login, loginAsDemo } = useRole();
  const navigate = useNavigate();

  const [credential, setCredential] = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [demoLoading, setDemoLoading] = useState(null); // role string while loading
  const [error, setError]           = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!credential.trim() || !password) {
      setError('Please enter your email/username and password.');
      return;
    }
    setLoading(true);
    try {
      await login({ credential: credential.trim(), password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role) => {
    setError(null);
    setDemoLoading(role);
    try {
      await loginAsDemo(role);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <MdInventory2 />
        </div>
        <h1 className="auth-brand-name">InvenSight</h1>
        <p className="auth-brand-tagline">
          Intelligent Inventory Forecasting &amp; Sales Analytics for Kenyan SMEs
        </p>
        <ul className="auth-brand-features">
          <li>Demand forecasting with confidence bands</li>
          <li>Real-time stock &amp; reorder alerts</li>
          <li>Sales analytics &amp; trend insights</li>
          <li>Role-based access for your whole team</li>
        </ul>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card">
          <h2 className="auth-card-title">Sign in to your account</h2>
          <p className="auth-card-sub">Enter your email or username to continue.</p>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="auth-field">
              <label htmlFor="credential">Email or Username</label>
              <input
                id="credential"
                type="text"
                placeholder="you@company.co.ke or username"
                value={credential}
                onChange={e => setCredential(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-input-wrap">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                >
                  {showPw ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
            </div>

            <button className="auth-btn-primary" type="submit" disabled={loading || !!demoLoading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>

          {(!initialized || isPublicInstance) && (
            <p className="auth-switch" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
              {!initialized
                ? <><Link to="/setup">Set up your dashboard?</Link> - first-time setup</>
                : <>Want this for your business? <Link to="/request-access">Request access</Link></>
              }
            </p>
          )}

          {/* Demo section */}
          <div className="auth-demo">
            <div className="auth-demo-label">Try a live demo</div>
            <p className="auth-demo-hint" style={{ marginBottom: '.75rem', marginTop: 0 }}>
              Explore the full dashboard with sample data - no account needed.
            </p>
            <div className="auth-demo-cards">
              {DEMO_ROLES.map(({ role, label, color, desc }) => (
                <button
                  key={role}
                  className="auth-demo-card"
                  style={{ '--demo-color': color }}
                  onClick={() => handleDemo(role)}
                  disabled={!!demoLoading || loading}
                  type="button"
                >
                  <span className="auth-demo-card-label">
                    {demoLoading === role ? 'Loading…' : label}
                  </span>
                  <span className="auth-demo-card-desc">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
