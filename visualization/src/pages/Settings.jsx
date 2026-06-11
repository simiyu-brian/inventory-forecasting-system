import { useEffect, useState } from 'react';
import { getUsers, inviteUser, changeUserRole, deactivateUser } from '../api/api';
import { useGlobalFilter, DATE_RANGE_OPTIONS } from '../context/GlobalFilterContext';
import { useRole } from '../context/RoleContext';
import { SkeletonRows, ErrorState } from '../components/ui/States';
import { MdCheckCircle, MdPersonAdd, MdClose } from 'react-icons/md';
import './Settings.css';

const ROLES        = ['operational', 'analytical', 'management'];
const WAREHOUSES   = ['Main', 'Branch1', 'Branch2'];
const DEPARTMENTS  = ['Demand Planning', 'Procurement', 'Finance', 'Operations'];

const STATUS_BADGE = {
  active:      { label: 'Active',   cls: 'badge-ok'      },
  invited:     { label: 'Invited',  cls: 'badge-warning' },
  deactivated: { label: 'Inactive', cls: 'badge-muted'   },
};

export default function Settings() {
  const { prefs, setPrefs }    = useGlobalFilter();
  const { user: currentUser }  = useRole();

  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [saved,   setSaved]   = useState(false);

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviting,   setInviting]   = useState(false);
  const [inviteErr,  setInviteErr]  = useState(null);
  const [inviteOk,   setInviteOk]   = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: '', warehouse: '', department: '' });

  const load = () => {
    setLoading(true); setError(null);
    getUsers()
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRoleChange = async (id, role) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    await changeUserRole(id, role);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this account? The user will no longer be able to sign in.')) return;
    await deactivateUser(id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'deactivated' } : u));
  };

  const handlePrefChange = (key, value) => {
    setPrefs({ [key]: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submitInvite = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role) {
      setInviteErr('Name, email, and role are required.'); return;
    }
    setInviteErr(null); setInviting(true);
    try {
      await inviteUser({
        name:       form.name.trim(),
        email:      form.email.trim().toLowerCase(),
        role:       form.role,
        warehouse:  form.role === 'operational' ? form.warehouse || undefined : undefined,
        department: form.role === 'analytical'  ? form.department || undefined : undefined,
      });
      setInviteOk(`Invitation sent to ${form.email}.`);
      setForm({ name: '', email: '', role: '', warehouse: '', department: '' });
      load(); // refresh list
    } catch (err) {
      setInviteErr(err.message);
    } finally {
      setInviting(false);
    }
  };

  const closeInvite = () => { setShowInvite(false); setInviteErr(null); setInviteOk(null); };

  return (
    <div className="page">
      <div className="page-title">Settings &amp; Admin</div>

      {/* ── User Management ──────────────────────────────────────────────── */}
      <div className="card" style={{ maxWidth: 720, marginBottom: '.875rem' }}>
        <div className="settings-section-header">
          <div className="chart-card-title" style={{ marginBottom: 0 }}>User Management</div>
          <button className="invite-btn" onClick={() => { setShowInvite(true); setInviteOk(null); setInviteErr(null); }}>
            <MdPersonAdd /> Invite User
          </button>
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="invite-form-wrap">
            <div className="invite-form-header">
              <span>Invite a new user</span>
              <button className="invite-close" onClick={closeInvite}><MdClose /></button>
            </div>

            {inviteOk && (
              <div className="invite-success-msg"><MdCheckCircle /> {inviteOk}</div>
            )}
            {inviteErr && (
              <div className="invite-error-msg">{inviteErr}</div>
            )}

            <form className="invite-form" onSubmit={submitInvite} noValidate>
              <div className="invite-row">
                <div className="invite-field">
                  <label>Full Name</label>
                  <input type="text" placeholder="e.g. Grace Muthoni" value={form.name} onChange={setField('name')} />
                </div>
                <div className="invite-field">
                  <label>Email</label>
                  <input type="email" placeholder="grace@store.co.ke" value={form.email} onChange={setField('email')} />
                </div>
              </div>

              <div className="invite-row">
                <div className="invite-field">
                  <label>Role</label>
                  <select value={form.role} onChange={setField('role')}>
                    <option value="" disabled>Select role…</option>
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>

                {form.role === 'operational' && (
                  <div className="invite-field">
                    <label>Warehouse</label>
                    <select value={form.warehouse} onChange={setField('warehouse')}>
                      <option value="">None / TBD</option>
                      {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                )}

                {form.role === 'analytical' && (
                  <div className="invite-field">
                    <label>Department</label>
                    <select value={form.department} onChange={setField('department')}>
                      <option value="">None / TBD</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="invite-actions">
                <button type="button" className="invite-cancel" onClick={closeInvite}>Cancel</button>
                <button type="submit" className="invite-submit" disabled={inviting}>
                  {inviting ? 'Sending…' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User table */}
        {loading ? <SkeletonRows count={4} /> :
         error   ? <ErrorState message={error} onRetry={load} /> :
        <table className="settings-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const badge   = STATUS_BADGE[u.status] || STATUS_BADGE.active;
              const isSelf  = u.id === currentUser?.id;
              return (
                <tr key={u.id} className={u.status === 'deactivated' ? 'row-muted' : ''}>
                  <td>{u.name}</td>
                  <td className="settings-email">{u.email}</td>
                  <td>
                    {u.status === 'deactivated' ? (
                      <span style={{ fontSize: '.775rem', color: 'var(--color-text-muted)' }}>{u.role}</span>
                    ) : (
                      <select
                        className="topbar-select"
                        value={u.role}
                        disabled={isSelf}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                      </select>
                    )}
                  </td>
                  <td><span className={`status-badge ${badge.cls}`}>{badge.label}</span></td>
                  <td>
                    {!isSelf && u.status === 'active' && (
                      <button className="deactivate-btn" onClick={() => handleDeactivate(u.id)} title="Deactivate">
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>}
      </div>

      {/* ── Preferences ──────────────────────────────────────────────────── */}
      <div className="card settings-prefs" style={{ maxWidth: 720 }}>
        <div className="settings-prefs-header">
          <div className="chart-card-title" style={{ marginBottom: 0 }}>Preferences</div>
          {saved && <span className="saved-indicator"><MdCheckCircle /> Saved</span>}
        </div>

        <div className="pref-row">
          <label>Default date range</label>
          <select
            className="topbar-select"
            value={prefs.defaultPeriod}
            onChange={e => handlePrefChange('defaultPeriod', e.target.value)}
          >
            {DATE_RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="pref-row">
          <label>
            Warning buffer above reorder point
            <span className="pref-hint">Stock within this % above reorder point shows as "Warning"</span>
          </label>
          <div className="pref-number-wrap">
            <input
              className="modal-input"
              type="number" min={0} max={100}
              value={prefs.warningBuffer}
              onChange={e => handlePrefChange('warningBuffer', Math.max(0, Math.min(100, +e.target.value)))}
              style={{ width: 70 }}
            />
            <span style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>%</span>
          </div>
        </div>

        <div className="pref-row">
          <label>Currency</label>
          <select
            className="topbar-select"
            value={prefs.currency}
            onChange={e => handlePrefChange('currency', e.target.value)}
          >
            <option value="KES">KES - Kenyan Shilling</option>
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
          </select>
        </div>
      </div>
    </div>
  );
}
