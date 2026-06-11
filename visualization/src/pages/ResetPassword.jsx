import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { MdInventory2, MdVisibility, MdVisibilityOff, MdCheckCircle } from 'react-icons/md';
import { resetPassword } from '../api/api';
import './Login.css';

export default function ResetPassword() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [done,     setDone]     = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) { setError('Reset token is missing. Please use the link from your email.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(token, password);
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
        <p className="auth-brand-tagline">Choose a strong new password for your account.</p>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card">
          {!done ? (
            <>
              <h2 className="auth-card-title">Set a new password</h2>
              <p className="auth-card-sub">Must be at least 6 characters.</p>

              {!token && (
                <div className="auth-error">
                  Invalid reset link. Please request a new one from the <Link to="/forgot-password">forgot password</Link> page.
                </div>
              )}

              {error && <div className="auth-error">{error}</div>}

              <form className="auth-form" onSubmit={submit} noValidate>
                <div className="auth-field">
                  <label htmlFor="password">New Password</label>
                  <div className="auth-input-wrap">
                    <input
                      id="password" type={showPw ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={password} onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password" autoFocus
                    />
                    <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                      {showPw ? <MdVisibilityOff /> : <MdVisibility />}
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="confirm">Confirm New Password</label>
                  <input
                    id="confirm" type="password" placeholder="Repeat password"
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <button className="auth-btn-primary" type="submit" disabled={loading || !token}>
                  {loading ? 'Saving…' : 'Set New Password'}
                </button>
              </form>

              <p className="auth-switch"><Link to="/login">Back to Sign In</Link></p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <MdCheckCircle style={{ fontSize: '3rem', color: 'var(--color-ok)', display: 'block', margin: '0 auto .75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 .5rem' }}>Password updated!</h3>
              <p style={{ fontSize: '.825rem', color: 'var(--color-text-muted)', margin: '0 0 1.5rem' }}>
                Your password has been reset. You can now sign in with your new password.
              </p>
              <button className="auth-btn-primary" onClick={() => navigate('/login')}>
                Go to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
