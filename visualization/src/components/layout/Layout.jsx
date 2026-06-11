import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdScience, MdClose } from 'react-icons/md';
import Sidebar from './Sidebar';
import TopBar  from './TopBar';
import { useRole } from '../../context/RoleContext';
import './Layout.css';

function DemoBanner({ onExit }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="demo-banner">
      <div className="demo-banner-inner">
        <MdScience className="demo-banner-icon" />
        <span>
          You're exploring a <strong>demo</strong> with sample data.
          Nothing here is real. Changes will <strong>NOT</strong> be saved.
        </span>
        <div className="demo-banner-actions">
          <button className="demo-banner-exit" onClick={onExit}>
            Exit Demo
          </button>
          <button className="demo-banner-dismiss" onClick={() => setDismissed(true)} title="Dismiss">
            <MdClose />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children, alertCount }) {
  const { isDemo, logout } = useRole();
  const navigate = useNavigate();

  const handleExitDemo = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`layout ${isDemo ? 'layout-has-banner' : ''}`}>
      {isDemo && <DemoBanner onExit={handleExitDemo} />}
      <Sidebar />
      <TopBar alertCount={alertCount} />
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
}
