import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { MdInventory2, MdVisibility, MdVisibilityOff, MdCheckCircle } from 'react-icons/md';
import { getInvite, acceptInvite } from '../api/api';
import './Login.css';
import './AcceptInvite.css';

const ROLE_LABEL = { operational: 'Operational', analytical: 'Analytical', management: 'Management' };

export default function AcceptInvite() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token') || '';

  const [invite,   setInvite]   = useState(null);    // { name, email, role }
  const [checking, setChecking] = useState(true);
  const [tokenErr, setTokenErr] = useState(null);

  const [password, setPassword]     = useState('');
  const [confirm,  setConfirm]      = useState('');
  const [username, setUsername]     = useState('');
  const [showPw,   setShowPw]       = useState(false);
  const [loading,  setLoading]      = useState(false);
  const [error,    setError]        = useState(null);
  const [done,     setDone]         = useState(false);

  useEffect(() => {
    if (!token) { setTokenErr('No invitation token found in this link.'); setChecking(false); return; }
    getInvite(token)
      .then(setInvite)
      .catch((e) => setTokenErr(e.message))
      .finally(() => setChecking(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError(null);
    setLoading(true);
    try {
      await acceptInvite(token, { password, username: username.trim() || undefined });
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
          You've been invited to join the team. Set your password to activate your account.
        </p>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card">
          {checking && (
            <div className="invite-checking">Validating invitation…</div>
          )}

          {!checking && tokenErr && (
            <div className="invite-error-state">
              <div className="invite-error-icon">⚠</div>
              <h3>Invitation not valid</h3>
              <p>{tokenErr}</p>
              <p className="auth-switch"><Link to="/login">Go to Sign In</Link></p>
            </div>
          )}

          {!checking && invite && !done && (
            <>
              <div className="invite-welcome">
                <div className="invite-avatar">
                  {invite.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="invite-name">{invite.name}</div>
                  <div className="invite-email">{invite.email}</div>
                  <span className={`invite-role-badge role-${invite.role}`}>
                    {ROLE_LABEL[invite.role]}
                  </span>
                </div>
              </div>

              <h2 className="auth-card-title" style={{ marginTop: '1.25rem' }}>Set your password</h2>
              <p className="auth-card-sub">Your name and role have already been set by your admin.</p>

              {error && <div className="auth-error">{error}</div>}

              <form className="auth-form" onSubmit={submit} noValidate>
                {invite.role === 'operational' && (
                  <div className="auth-field">
                    <label htmlFor="username">Username <span className="auth-optional">(required for sign in)</span></label>
                    <input
                      id="username" type="text" placeholder="e.g. john_wh"
                      value={username} onChange={e => setUsername(e.target.value)}
                      autoComplete="username"
                    />
                  </div>
                )}

                {invite.role !== 'operational' && (
                  <div className="auth-field">
                    <label htmlFor="username">Username <span className="auth-optional">(optional - email works too)</span></label>
                    <input
                      id="username" type="text" placeholder="Short login alias"
                      value={username} onChange={e => setUsername(e.target.value)}
                      autoComplete="username"
                    />
                  </div>
                )}

                <div className="auth-field">
                  <label htmlFor="password">Password</label>
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
                  <label htmlFor="confirm">Confirm Password</label>
                  <input
                    id="confirm" type="password" placeholder="Repeat password"
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <button className="auth-btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Activating…' : 'Activate Account'}
                </button>
              </form>
            </>
          )}

          {done && (
            <div className="invite-success">
              <MdCheckCircle className="invite-success-icon" />
              <h3>Account activated!</h3>
              <p>Your account is ready. Sign in to get started.</p>
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
