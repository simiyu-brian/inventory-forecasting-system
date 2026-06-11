import { createContext, useContext, useState, useEffect } from 'react';
import {
  login as apiLogin, logout as apiLogout, authMe,
  demoLogin as apiDemoLogin, setDemoMode,
  getStoredToken, setStoredToken,
} from '../api/api';

const RoleContext = createContext(null);

const ROLES     = ['operational', 'analytical', 'management'];
const ROLE_RANK = { operational: 0, analytical: 1, management: 2 };
const MOCK_KEY  = 'iifsa_user';

export function canAccess(userRole, requiredRole) {
  return ROLE_RANK[userRole] >= ROLE_RANK[requiredRole];
}

export function RoleProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [devRole, setDevRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token   = getStoredToken();
    const mockRaw = localStorage.getItem(MOCK_KEY);

    if (mockRaw) {
      try {
        const parsed = JSON.parse(mockRaw);
        if (parsed._isDemo) setDemoMode(true);
        setUser(parsed);
      } catch {
        localStorage.removeItem(MOCK_KEY);
      }
      setLoading(false);
      return;
    }

    if (token) {
      authMe()
        .then((u) => { if (u) setUser(u); })
        .catch(() => setStoredToken(null))
        .finally(() => setLoading(false));
      return;
    }

    setLoading(false);
  }, []);

  const effectiveRole   = devRole || user?.role || 'operational';
  const isAuthenticated = !!user;
  const isDemo          = !!user?._isDemo;

  const login = async (credentials) => {
    const { accessToken, user: loggedIn } = await apiLogin(credentials);
    if (accessToken) {
      setStoredToken(accessToken);
    } else {
      localStorage.setItem(MOCK_KEY, JSON.stringify(loggedIn));
    }
    setUser(loggedIn);
    return loggedIn;
  };

  const loginAsDemo = async (role) => {
    const { user: demoUser } = await apiDemoLogin(role);
    localStorage.setItem(MOCK_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  };

  const logout = async () => {
    try { await apiLogout(); } catch {}
    setStoredToken(null);
    localStorage.removeItem(MOCK_KEY);
    setDemoMode(false);
    setUser(null);
    setDevRole(null);
  };

  return (
    <RoleContext.Provider value={{
      user, effectiveRole, devRole, setDevRole,
      loading, isAuthenticated, isDemo, login, loginAsDemo, logout, ROLES,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
