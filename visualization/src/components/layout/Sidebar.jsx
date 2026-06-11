import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useRole, canAccess } from '../../context/RoleContext';
import {
  MdDashboard, MdInventory2, MdNotifications,
  MdBarChart, MdTrendingUp, MdInsights,
  MdShoppingCart, MdDownload, MdSettings,
  MdChevronLeft, MdChevronRight, MdStorefront,
} from 'react-icons/md';
import './Sidebar.css';

const NAV = [
  {
    section: 'Monitor',
    items: [
      { to: '/',          label: 'Overview',   icon: MdDashboard,   minRole: 'operational' },
      { to: '/inventory', label: 'Inventory',  icon: MdInventory2,  minRole: 'operational' },
      { to: '/alerts',    label: 'Alerts',     icon: MdNotifications, minRole: 'operational' },
    ],
  },
  {
    section: 'Analyze',
    items: [
      { to: '/sales',    label: 'Sales Analytics', icon: MdBarChart,   minRole: 'analytical' },
      { to: '/forecasts',label: 'Forecasts',        icon: MdTrendingUp, minRole: 'analytical' },
      { to: '/models',   label: 'Model Insights',   icon: MdInsights,   minRole: 'analytical' },
    ],
  },
  {
    section: 'Act & Manage',
    items: [
      { to: '/reorder',  label: 'Reorder & POs',   icon: MdShoppingCart, minRole: 'operational' },
      { to: '/reports',  label: 'Reports & Export', icon: MdDownload,     minRole: 'analytical'  },
      { to: '/settings', label: 'Settings',         icon: MdSettings,     minRole: 'management'  },
    ],
  },
];

export default function Sidebar() {
  const { effectiveRole } = useRole();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-brand">
        <MdStorefront className="sidebar-brand-icon" />
        <div className="sidebar-brand-text">
          InvenSight
          <span>Forecasting &amp; Analytics</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ section, items }) => {
          const visible = items.filter((i) => canAccess(effectiveRole, i.minRole));
          if (!visible.length) return null;
          return (
            <div key={section}>
              <div className="sidebar-section-label">{section}</div>
              {visible.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                  data-label={label}
                >
                  <Icon className="sidebar-item-icon" />
                  <span className="sidebar-item-label">{label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-toggle">
        <button onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <MdChevronRight /> : <MdChevronLeft />}
        </button>
      </div>
    </aside>
  );
}
