import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MdInventory2, MdCheckCircle, MdBusiness, MdPerson, MdEmail, MdPhone, MdMessage } from 'react-icons/md';
import { getApprovalDetails, approveRequest } from '../api/api';
import './Login.css';
import './ApproveRequest.css';

function Detail({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="ar-detail">
      <Icon className="ar-detail-icon" />
      <div>
        <div className="ar-detail-label">{label}</div>
        <div className="ar-detail-value">{value}</div>
      </div>
    </div>
  );
}

function formatDate(unixSec) {
  return new Date(unixSec * 1000).toLocaleString('en-KE', {
    dateStyle: 'medium', timeStyle: 'short',
  });
}

export default function ApproveRequest() {
  const [params] = useSearchParams();
  const id  = params.get('id')  || '';
  const key = params.get('key') || '';

  const [request,  setRequest]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [approving, setApproving] = useState(false);
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    if (!id || !key) { setError('Missing approval parameters.'); setLoading(false); return; }
    getApprovalDetails(id, key)
      .then(setRequest)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, key]);

  const handleApprove = async () => {
    setApproving(true);
    setError(null);
    try {
      await approveRequest(id, key);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-logo"><MdInventory2 /></div>
        <h1 className="auth-brand-name">InvenSight</h1>
        <p className="auth-brand-tagline">
          Review the access request below. Approving will generate a single-use setup token and send it to the requester.
        </p>
        <div className="ar-brand-note">
          <strong>What happens when you approve:</strong>
          <ul>
            <li>A 7-day single-use setup token is generated</li>
            <li>It is emailed directly to the requester</li>
            <li>You receive a confirmation (not the token)</li>
            <li>This link becomes invalid</li>
          </ul>
        </div>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card ar-card">
          {loading && <div className="ar-loading">Loading request details…</div>}

          {!loading && error && (
            <div className="ar-error-state">
              <div className="ar-error-icon">⚠</div>
              <h3>Cannot load request</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && request && !done && (
            <>
              <div className="ar-header">
                <h2 className="ar-title">Access Request</h2>
                <span className="ar-date">Submitted {formatDate(request.created_at)}</span>
              </div>

              <div className="ar-details">
                <Detail icon={MdBusiness} label="Business"      value={request.business_name} />
                <Detail icon={MdPerson}   label="Contact name"  value={request.name} />
                <Detail icon={MdEmail}    label="Email"         value={request.email} />
                <Detail icon={MdPhone}    label="Phone"         value={request.phone} />
                <Detail icon={MdMessage}  label="Their message" value={request.message} />
              </div>

              {error && <div className="auth-error" style={{ marginTop: '.75rem' }}>{error}</div>}

              <div className="ar-actions">
                <p className="ar-confirm-text">
                  Once approved, a setup token will be sent to <strong>{request.email}</strong>.
                  This action cannot be undone.
                </p>
                <button
                  className="ar-approve-btn"
                  onClick={handleApprove}
                  disabled={approving}
                >
                  {approving ? 'Issuing token…' : 'Approve & Send Token'}
                </button>
              </div>
            </>
          )}

          {done && (
            <div className="ar-done">
              <MdCheckCircle className="ar-done-icon" />
              <h3>Token issued</h3>
              <p>
                A setup token has been sent to <strong>{request?.email}</strong>.
                They'll use it in the setup wizard when their instance is ready.
              </p>
              <p className="ar-done-sub">
                You'll receive a separate confirmation email. This page can now be closed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
