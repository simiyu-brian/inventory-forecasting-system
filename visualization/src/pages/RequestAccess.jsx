import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdInventory2, MdCheckCircle, MdArrowBack, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { submitAccessRequest } from '../api/api';
import './Login.css';
import './RequestAccess.css';

export default function RequestAccess() {
  const [form, setForm] = useState({
    businessName: '', name: '', email: '', phone: '', password: '', confirmPassword: '', message: '',
  });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [done,    setDone]    = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const { businessName, name, email, phone, password, confirmPassword } = form;
    if (!businessName.trim() || !name.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await submitAccessRequest({
        businessName: businessName.trim(),
        name:         name.trim(),
        email:        email.trim().toLowerCase(),
        phone:        phone.trim(),
        password,
        message:      form.message.trim() || undefined,
      });
      setDone(true);
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
          Request your own InvenSight deployment for your business.
        </p>
        <ul className="auth-brand-features">
          <li>Your own private instance - your data stays yours</li>
          <li>Full setup wizard - no technical knowledge needed</li>
          <li>You'll hear back within 24 hours</li>
          <li>Invite your entire team once you're set up</li>
        </ul>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card">
          {!done ? (
            <>
              <Link to="/login" className="ra-back">
                <MdArrowBack /> Back to Sign In
              </Link>

              <h2 className="auth-card-title" style={{ marginTop: '.5rem' }}>Request access</h2>
              <p className="auth-card-sub">
                Tell us about your business. We'll review your request and send you a setup token within 24 hours.
              </p>

              {error && <div className="auth-error">{error}</div>}

              <form className="auth-form" onSubmit={submit} noValidate>
                <div className="auth-field">
                  <label htmlFor="businessName">Business Name <span className="ra-req">*</span></label>
                  <input
                    id="businessName" type="text" placeholder="e.g. Kamau Retail Ltd"
                    value={form.businessName} onChange={set('businessName')} autoFocus
                  />
                </div>

                <div className="ra-row">
                  <div className="auth-field">
                    <label htmlFor="name">Your Name <span className="ra-req">*</span></label>
                    <input
                      id="name" type="text" placeholder="Full name"
                      value={form.name} onChange={set('name')}
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="phone">Phone <span className="ra-req">*</span></label>
                    <input
                      id="phone" type="tel" placeholder="0712 345 678"
                      value={form.phone} onChange={set('phone')}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="email">Email Address <span className="ra-req">*</span></label>
                  <input
                    id="email" type="email" placeholder="you@yourbusiness.co.ke"
                    value={form.email} onChange={set('email')}
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="password">Password <span className="ra-req">*</span> <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '.72rem' }}>(min 8 characters)</span></label>
                  <div className="auth-input-wrap">
                    <input
                      id="password" type={showPw ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={form.password} onChange={set('password')}
                      autoComplete="new-password"
                    />
                    <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                      {showPw ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="confirmPassword">Confirm Password <span className="ra-req">*</span></label>
                  <input
                    id="confirmPassword" type="password" placeholder="Repeat password"
                    value={form.confirmPassword} onChange={set('confirmPassword')}
                    autoComplete="new-password"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="message">
                    Tell us about your business
                    <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '.72rem', marginLeft: '.4rem' }}>
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id="message"
                    placeholder="e.g. We run a small supermarket in Nairobi with 3 branches and about 10 staff…"
                    value={form.message}
                    onChange={set('message')}
                    rows={3}
                  />
                </div>

                <button className="auth-btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            </>
          ) : (
            <div className="ra-success">
              <MdCheckCircle className="ra-success-icon" />
              <h3>Request received!</h3>
              <p>
                We'll review your request and email you at <strong>{form.email}</strong> within 24 hours.
                If approved, you'll receive a setup token to activate your account - then you can sign in with the credentials you just set.
              </p>
              <Link to="/login" className="auth-btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem' }}>
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
