import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MdInventory2, MdVisibility, MdVisibilityOff,
  MdStorefront, MdQueryStats, MdWarehouse,
} from 'react-icons/md';
import { useRole } from '../context/RoleContext';
import './Login.css';
import './Signup.css';

const ROLES = [
  {
    value: 'operational',
    label: 'Operational',
    icon: MdWarehouse,
    description: 'Clerks & warehouse staff - stock management and task-driven views.',
    color: '#065f46',
    bg: '#d1fae5',
  },
  {
    value: 'analytical',
    label: 'Analytical',
    icon: MdQueryStats,
    description: 'Analysts & planners - sales trends, forecasts, and model insights.',
    color: '#1d4ed8',
    bg: '#dbeafe',
  },
  {
    value: 'management',
    label: 'Management',
    icon: MdStorefront,
    description: 'Business owners - full access including KPIs, admin, and reporting.',
    color: '#6d28d9',
    bg: '#ede9fe',
  },
];

const WAREHOUSES   = ['Main', 'Branch1', 'Branch2'];
const DEPARTMENTS  = ['Demand Planning', 'Procurement', 'Finance', 'Operations'];

function Field({ id, label, children, hint }) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="signup-hint">{hint}</span>}
    </div>
  );
}

export default function Signup() {
  const { signup } = useRole();
  const navigate   = useNavigate();

  const [role, setRole]       = useState('');
  const [form, setForm]       = useState({});
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    if (!role)              return 'Please select a role.';
    if (!form.name?.trim()) return 'Full name is required.';
    if (role !== 'operational' && !form.email?.trim()) return 'Email is required.';
    if (role === 'operational' && !form.username?.trim()) return 'Username is required.';
    if (!form.password)     return 'Password is required.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (role === 'operational' && !form.warehouse) return 'Please select a warehouse.';
    if (role === 'analytical' && !form.department) return 'Please select a department.';
    if (role === 'management' && !form.businessName?.trim()) return 'Business name is required.';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setLoading(true);
    try {
      await signup({ ...form, role,
        username: form.username || form.email?.split('@')[0],
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-logo"><MdInventory2 /></div>
        <h1 className="auth-brand-name">InvenSight</h1>
        <p className="auth-brand-tagline">
          Create your account. Your role determines what you can see and do in the system.
        </p>
        <div className="auth-brand-roles">
          {ROLES.map(r => (
            <div key={r.value} className="auth-brand-role-item">
              <div className="auth-brand-role-icon" style={{ background: r.bg, color: r.color }}>
                <r.icon />
              </div>
              <div>
                <div className="auth-brand-role-name">{r.label}</div>
                <div className="auth-brand-role-desc">{r.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card signup-card">
          <h2 className="auth-card-title">Create an account</h2>
          <p className="auth-card-sub">Choose your role.</p>

          {error && <div className="auth-error">{error}</div>}

          {/* Role selector */}
          <div className="signup-role-grid">
            {ROLES.map(r => (
              <button
                key={r.value}
                type="button"
                className={`signup-role-card ${role === r.value ? 'selected' : ''}`}
                style={{ '--role-color': r.color, '--role-bg': r.bg }}
                onClick={() => { setRole(r.value); setError(null); }}
              >
                <r.icon className="signup-role-icon" />
                <span>{r.label}</span>
              </button>
            ))}
          </div>

          {role && (
            <form className="auth-form signup-form" onSubmit={submit} noValidate>
              {/* Common: full name */}
              <Field id="name" label="Full Name">
                <input
                  id="name" type="text" placeholder="e.g. Alice Wanjiru"
                  value={form.name || ''} onChange={set('name')} autoComplete="name"
                />
              </Field>

              {/* Operational: username only */}
              {role === 'operational' && (
                <Field id="username" label="Username" hint="Used to sign in. No email required.">
                  <input
                    id="username" type="text" placeholder="e.g. alice_wh"
                    value={form.username || ''} onChange={set('username')} autoComplete="username"
                  />
                </Field>
              )}

              {/* Analytical + Management: email */}
              {role !== 'operational' && (
                <Field id="email" label="Email Address">
                  <input
                    id="email" type="email" placeholder="you@company.co.ke"
                    value={form.email || ''} onChange={set('email')} autoComplete="email"
                  />
                </Field>
              )}

              {/* Analytical: username */}
              {role === 'analytical' && (
                <Field id="username" label="Username" hint="Short name for signing in.">
                  <input
                    id="username" type="text" placeholder="e.g. alice"
                    value={form.username || ''} onChange={set('username')} autoComplete="username"
                  />
                </Field>
              )}

              {/* Password */}
              <Field id="password" label="Password">
                <div className="auth-input-wrap">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={form.password || ''}
                    onChange={set('password')}
                    autoComplete="new-password"
                  />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                    {showPw ? <MdVisibilityOff /> : <MdVisibility />}
                  </button>
                </div>
              </Field>

              <Field id="confirmPassword" label="Confirm Password">
                <input
                  id="confirmPassword" type="password" placeholder="Repeat password"
                  value={form.confirmPassword || ''} onChange={set('confirmPassword')}
                  autoComplete="new-password"
                />
              </Field>

              {/* Operational: warehouse */}
              {role === 'operational' && (
                <Field id="warehouse" label="Warehouse Assignment">
                  <select id="warehouse" value={form.warehouse || ''} onChange={set('warehouse')}>
                    <option value="" disabled>Select warehouse…</option>
                    {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </Field>
              )}

              {/* Analytical: department */}
              {role === 'analytical' && (
                <Field id="department" label="Department">
                  <select id="department" value={form.department || ''} onChange={set('department')}>
                    <option value="" disabled>Select department…</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              )}

              {/* Management: business fields */}
              {role === 'management' && (
                <>
                  <Field id="businessName" label="Business Name">
                    <input
                      id="businessName" type="text" placeholder="e.g. Kamau Retail Ltd"
                      value={form.businessName || ''} onChange={set('businessName')}
                    />
                  </Field>
                  <Field id="businessReg" label="Business Registration No." hint="KRA / Business Registration Service number (optional).">
                    <input
                      id="businessReg" type="text" placeholder="e.g. BN-2024-00123"
                      value={form.businessReg || ''} onChange={set('businessReg')}
                    />
                  </Field>
                  <Field id="phone" label="Phone Number" hint="For account recovery.">
                    <input
                      id="phone" type="tel" placeholder="e.g. 0712 345 678"
                      value={form.phone || ''} onChange={set('phone')}
                    />
                  </Field>
                </>
              )}

              <button className="auth-btn-primary" type="submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="auth-switch" style={{ marginTop: role ? '.75rem' : '1.25rem' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
