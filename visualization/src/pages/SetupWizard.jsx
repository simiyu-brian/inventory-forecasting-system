import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MdInventory2, MdCheckCircle } from 'react-icons/md';
import { useRole } from '../context/RoleContext';
import { initializeSystem } from '../api/api';
import './Login.css';
import './SetupWizard.css';

const TIMEZONES = [
  { value: 'Africa/Nairobi',      label: 'East Africa Time (EAT) - Nairobi'  },
  { value: 'Africa/Lagos',        label: 'West Africa Time (WAT) - Lagos'     },
  { value: 'Africa/Cairo',        label: 'Eastern European Time - Cairo'       },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time'          },
  { value: 'UTC',                 label: 'UTC'                                  },
];

const CURRENCIES = [
  { value: 'KES', label: 'KES - Kenyan Shilling'   },
  { value: 'UGX', label: 'UGX - Ugandan Shilling'  },
  { value: 'TZS', label: 'TZS - Tanzanian Shilling' },
  { value: 'NGN', label: 'NGN - Nigerian Naira'     },
  { value: 'GHS', label: 'GHS - Ghanaian Cedi'      },
  { value: 'USD', label: 'USD - US Dollar'           },
];

const DEMO_ROLES = [
  { role: 'management',  label: 'Management',  color: '#6d28d9', desc: 'Full access - KPIs, forecasts, admin' },
  { role: 'analytical',  label: 'Analytical',  color: '#1d4ed8', desc: 'Sales analytics, forecasts, reports'  },
  { role: 'operational', label: 'Operational', color: '#065f46', desc: 'Inventory, alerts, stock tasks'        },
];

const STEPS = ['Activation', 'Business'];

function StepIndicator({ current }) {
  return (
    <div className="sw-steps">
      {STEPS.map((label, i) => (
        <div key={i} className={`sw-step ${i < current ? 'done' : i === current ? 'active' : ''}`}>
          <div className="sw-step-dot">{i < current ? <MdCheckCircle /> : i + 1}</div>
          <div className="sw-step-label">{label}</div>
          {i < STEPS.length - 1 && <div className="sw-step-line" />}
        </div>
      ))}
    </div>
  );
}

export default function SetupWizard({ onComplete }) {
  const { loginAsDemo } = useRole();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    setupToken: '',
    businessName: '', timezone: 'Africa/Nairobi', currency: 'KES',
  });
  const [loading,     setLoading]     = useState(false);
  const [demoLoading, setDemoLoading] = useState(null);
  const [error,       setError]       = useState(null);
  const [done,        setDone]        = useState(false);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setError(null); };

  const validateStep = () => {
    if (step === 0 && !form.setupToken.trim()) return 'Please paste your setup token.';
    if (step === 1 && !form.businessName.trim()) return 'Business name is required.';
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => s + 1);
  };

  const back = () => { setError(null); setStep(s => s - 1); };

  const submit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);
    try {
      await initializeSystem({
        setupToken:   form.setupToken.trim(),
        businessName: form.businessName.trim(),
        timezone:     form.timezone,
        currency:     form.currency,
      });
      setDone(true);
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

  if (done) {
    return (
      <div className="sw-page">
        <div className="sw-card">
          <div className="sw-done">
            <MdCheckCircle className="sw-done-icon" />
            <h2>You're all set!</h2>
            <p>Your InvenSight dashboard is ready. Sign in with the email and password you set when you submitted your request.</p>
            <button className="auth-btn-primary sw-done-btn" onClick={onComplete}>
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sw-page">
      <div className="sw-card">
        <div className="sw-header">
          <div className="sw-logo"><MdInventory2 /></div>
          <div>
            <h1 className="sw-title">Welcome to InvenSight</h1>
            <p className="sw-sub">Let's set up your dashboard. It takes about 2 minutes.</p>
          </div>
        </div>

        <StepIndicator current={step} />

        {error && <div className="auth-error sw-error">{error}</div>}

        {/* ── Step 0: Activation ── */}
        {step === 0 && (
          <div className="sw-step-body">
            <h3 className="sw-step-title">Activation token</h3>
            <p className="sw-step-hint">
              Paste the setup token from your approval email. It's a long string - paste it exactly as received.
            </p>

            <div className="auth-field">
              <label htmlFor="setupToken">Setup Token</label>
              <textarea
                id="setupToken"
                className="sw-token-input"
                placeholder="Paste your token here…"
                value={form.setupToken}
                onChange={set('setupToken')}
                rows={4}
                autoFocus
                spellCheck={false}
              />
            </div>

            <p className="sw-no-token">
              Don't have a token yet?{' '}
              <Link to="/request-access">Request a setup token</Link>
              {' '} we'll review and send one within 24 hours.
            </p>

            <div className="auth-demo sw-demo">
              <div className="auth-demo-label">Or try a live demo first</div>
              <p className="auth-demo-hint">Explore the full dashboard with sample data - no account needed.</p>
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
        )}

        {/* ── Step 1: Business ── */}
        {step === 1 && (
          <div className="sw-step-body">
            <h3 className="sw-step-title">Business details</h3>

            <div className="auth-field">
              <label htmlFor="businessName">Business Name</label>
              <input id="businessName" type="text" placeholder="e.g. Kamau Retail Ltd"
                value={form.businessName} onChange={set('businessName')} autoFocus />
            </div>

            <div className="sw-row">
              <div className="auth-field">
                <label htmlFor="timezone">Timezone</label>
                <select id="timezone" value={form.timezone} onChange={set('timezone')}>
                  {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="currency">Currency</label>
                <select id="currency" value={form.currency} onChange={set('currency')}>
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="sw-review">
              <div className="sw-review-title">Review</div>
              <div className="sw-review-row"><span>Business</span><strong>{form.businessName}</strong></div>
              <div className="sw-review-row"><span>Currency</span><strong>{form.currency}</strong></div>
              <div className="sw-review-row"><span>Timezone</span><strong>{form.timezone}</strong></div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="sw-nav">
          {step > 0 && (
            <button className="sw-back-btn" onClick={back} disabled={loading}>
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 1 ? (
            <button className="auth-btn-primary sw-next-btn" onClick={next} disabled={!!demoLoading}>
              Continue
            </button>
          ) : (
            <button className="auth-btn-primary sw-next-btn" onClick={submit} disabled={loading}>
              {loading ? 'Setting up…' : 'Set Up My Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
