import { Component, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider, useRole, canAccess } from './context/RoleContext';
import { GlobalFilterProvider } from './context/GlobalFilterContext';
import { checkSetupStatus } from './api/api';
import Layout         from './components/layout/Layout';
import Overview       from './pages/Overview';
import Inventory      from './pages/Inventory';
import Alerts         from './pages/Alerts';
import SalesAnalytics from './pages/SalesAnalytics';
import Forecasts      from './pages/Forecasts';
import ModelInsights  from './pages/ModelInsights';
import ReorderPO      from './pages/ReorderPO';
import Reports        from './pages/Reports';
import Settings       from './pages/Settings';
import Login          from './pages/Login';
import AcceptInvite   from './pages/AcceptInvite';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import RequestAccess  from './pages/RequestAccess';
import ApproveRequest from './pages/ApproveRequest';
import SetupWizard    from './pages/SetupWizard';
import './styles/variables.css';
import './styles/global.css';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#dc2626' }}>
          <h2>Render Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '.85rem' }}>
            {this.state.error.toString()}{'\n\n'}{this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const OPEN_ALERTS = 4;

function ProtectedRoute({ minRole, element }) {
  const { effectiveRole } = useRole();
  return canAccess(effectiveRole, minRole) ? element : <Navigate to="/" replace />;
}

function DashboardRoutes() {
  return (
    <Layout alertCount={OPEN_ALERTS}>
      <Routes>
        <Route path="/"          element={<Overview />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/alerts"    element={<Alerts />} />
        <Route path="/sales"     element={<ProtectedRoute minRole="analytical" element={<SalesAnalytics />} />} />
        <Route path="/forecasts" element={<ProtectedRoute minRole="analytical" element={<Forecasts />} />} />
        <Route path="/models"    element={<ProtectedRoute minRole="analytical" element={<ModelInsights />} />} />
        <Route path="/reorder"   element={<ReorderPO />} />
        <Route path="/reports"   element={<ProtectedRoute minRole="analytical" element={<Reports />} />} />
        <Route path="/settings"  element={<ProtectedRoute minRole="management" element={<Settings />} />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading: authLoading } = useRole();
  const [sys, setSys] = useState(null); // null = checking

  useEffect(() => {
    checkSetupStatus()
      .then(setSys)
      .catch(() => setSys({ initialized: true, isPublicInstance: false }));
  }, []);

  // Hold render until both checks settle
  if (authLoading || sys === null) return null;

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login"
        element={isAuthenticated
          ? <Navigate to="/" replace />
          : <Login isPublicInstance={sys.isPublicInstance} initialized={sys.initialized} />}
      />
      <Route path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPassword />}
      />

      {/* Onboarding routes - always public */}
      <Route path="/request-access"
        element={(sys.isPublicInstance || !sys.initialized) ? <RequestAccess /> : <Navigate to="/login" replace />}
      />
      <Route path="/setup"
        element={(!sys.isPublicInstance && sys.initialized)
          ? <Navigate to="/login" replace />
          : <SetupWizard onComplete={() => setSys(s => ({ ...s, initialized: true }))} />}
      />
      <Route path="/approve-request" element={<ApproveRequest />} />
      <Route path="/accept-invite"   element={<AcceptInvite />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Dashboard - requires auth */}
      <Route path="/*"
        element={isAuthenticated ? <DashboardRoutes /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RoleProvider>
          <GlobalFilterProvider>
            <AppRoutes />
          </GlobalFilterProvider>
        </RoleProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
