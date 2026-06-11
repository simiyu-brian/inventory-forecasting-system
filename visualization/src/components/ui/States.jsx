import { MdInbox, MdErrorOutline } from 'react-icons/md';
import './States.css';

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card">
      <div className="skeleton skeleton-title" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-text" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-row" />
      ))}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', desc = '', icon }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon || <MdInbox />}</div>
      <div className="empty-state-title">{title}</div>
      {desc && <div className="empty-state-desc">{desc}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="error-state">
      <div className="error-state-icon"><MdErrorOutline /></div>
      <div className="error-state-title">Failed to load</div>
      <div className="error-state-msg">{message}</div>
      {onRetry && <button className="btn-retry" onClick={onRetry}>Try again</button>}
    </div>
  );
}
