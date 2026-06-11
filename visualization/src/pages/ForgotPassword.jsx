import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdInventory2, MdCheckCircle } from 'react-icons/md';
import { forgotPassword } from '../api/api';
import './Login.css';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim());
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
          Enter the email address on your account and we'll send a reset link if it exists.
        </p>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card">
          {!done ? (
            <>
              <h2 className="auth-card-title">Forgot your password?</h2>
              <p className="auth-card-sub">
                Enter your account email and we'll send a reset link.
              </p>

              {error && <div className="auth-error">{error}</div>}

              <form className="auth-form" onSubmit={submit} noValidate>
                <div className="auth-field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email" type="email" placeholder="you@company.co.ke"
                    value={email} onChange={e => setEmail(e.target.value)}
                    autoComplete="email" autoFocus
                  />
                </div>
                <button className="auth-btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <p className="auth-switch"><Link to="/login">Back to Sign In</Link></p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <MdCheckCircle style={{ fontSize: '3rem', color: 'var(--color-ok)', display: 'block', margin: '0 auto .75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 .5rem' }}>Check your email</h3>
              <p style={{ fontSize: '.825rem', color: 'var(--color-text-muted)', margin: '0 0 1.5rem' }}>
                If an account exists for <strong>{email}</strong>, a reset link has been sent.
                Check your inbox (and spam folder).
              </p>
              <p className="auth-switch"><Link to="/login">Back to Sign In</Link></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
