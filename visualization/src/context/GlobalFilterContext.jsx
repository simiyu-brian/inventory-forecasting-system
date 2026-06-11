import { createContext, useContext, useState, useEffect } from 'react';
import { getInventory, getAlerts } from '../api/api';
import { useRole } from './RoleContext';

const GlobalFilterContext = createContext(null);

export const DATE_RANGE_OPTIONS = [
  { value: '7d',  label: 'Last 7 days',  days: 7   },
  { value: '30d', label: 'Last 30 days', days: 30  },
  { value: '90d', label: 'Last 90 days', days: 90  },
  { value: '1y',  label: 'This year',    days: 365 },
];

const PREF_KEY = 'invensight_prefs';
const DEFAULT_PREFS = { warningBuffer: 30, currency: 'KES', defaultPeriod: '30d' };

function loadPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; }
  catch { return DEFAULT_PREFS; }
}

export function GlobalFilterProvider({ children }) {
  const { isAuthenticated } = useRole();

  const [prefs, setPrefsState] = useState(loadPrefs);
  const [dateRange, setDateRange] = useState(() => loadPrefs().defaultPeriod || '30d');
  const [warehouse, setWarehouse] = useState('all');
  const [category, setCategory]   = useState('all');

  // Loaded after login - used for search results and deriving filter option lists
  const [allProducts, setAllProducts] = useState([]);
  const [allAlerts,   setAllAlerts]   = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getInventory().then(setAllProducts).catch(() => {});
    getAlerts('all').then(setAllAlerts).catch(() => {});
  }, [isAuthenticated]);

  const warehouses = ['all', ...new Set(allProducts.map(p => p.warehouse))];
  const categories = ['all', ...new Set(allProducts.map(p => p.category))];

  const setPrefs = (updates) => {
    setPrefsState(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <GlobalFilterContext.Provider value={{
      dateRange, setDateRange,
      warehouse, setWarehouse,
      category,  setCategory,
      warehouses, categories,
      allProducts, allAlerts,
      prefs, setPrefs,
    }}>
      {children}
    </GlobalFilterContext.Provider>
  );
}

export function useGlobalFilter() {
  return useContext(GlobalFilterContext);
}
