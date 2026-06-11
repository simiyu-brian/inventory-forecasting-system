import { useEffect, useState, useMemo } from 'react';
import { getInventory, adjustInventory } from '../api/api';
import { useGlobalFilter } from '../context/GlobalFilterContext';
import { SkeletonRows, EmptyState, ErrorState } from '../components/ui/States';
import { MdEdit, MdSearch, MdArrowUpward, MdArrowDownward, MdUnfoldMore } from 'react-icons/md';
import './Inventory.css';

function statusOf(stock, reorderPoint, bufferPct = 30) {
  if (stock === 0)                                    return 'critical';
  if (stock <= reorderPoint)                          return 'critical';
  if (stock <= reorderPoint * (1 + bufferPct / 100)) return 'warning';
  return 'ok';
}

const STATUS_LABEL = { ok: 'OK', warning: 'Low', critical: 'Critical' };

function StatusBadge({ stock, reorderPoint, buffer }) {
  const s = statusOf(stock, reorderPoint, buffer);
  const label = stock === 0 ? 'Out' : STATUS_LABEL[s];
  return <span className={`badge badge-${s}`}>{label}</span>;
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <MdUnfoldMore className="sort-icon muted" />;
  return sortDir === 'asc'
    ? <MdArrowUpward className="sort-icon active" />
    : <MdArrowDownward className="sort-icon active" />;
}

function AdjustModal({ product, onClose, onSave }) {
  const [qty,    setQty]    = useState(product.stock);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    await onSave(product.productId, qty, reason);
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal card">
        <div className="modal-title">Adjust Stock - {product.name}</div>
        <label className="modal-label">New quantity</label>
        <input className="modal-input" type="number" min={0} value={qty} onChange={e => setQty(+e.target.value)} />
        <label className="modal-label">Reason</label>
        <input className="modal-input" type="text" placeholder="e.g. Stock receipt" value={reason} onChange={e => setReason(e.target.value)} />
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

const STATUS_TABS = ['all', 'critical', 'warning', 'ok'];
const COLS = [
  { key: 'name',         label: 'Product'       },
  { key: 'category',     label: 'Category'      },
  { key: 'stock',        label: 'Stock'         },
  { key: 'reorderPoint', label: 'Reorder Point' },
  { key: 'warehouse',    label: 'Warehouse'     },
];

export default function Inventory() {
  const { warehouse, category, prefs } = useGlobalFilter();
  const buffer = prefs?.warningBuffer ?? 30;

  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortCol,      setSortCol]      = useState('name');
  const [sortDir,      setSortDir]      = useState('asc');
  const [editing,      setEditing]      = useState(null);

  const load = () => {
    setLoading(true); setError(null);
    getInventory().then(setItems).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleSave = async (productId, newStock, reason) => {
    await adjustInventory(productId, newStock, reason);
    setItems(prev => prev.map(p => p.productId === productId ? { ...p, stock: newStock } : p));
  };

  const baseItems = useMemo(() => items
    .filter(p => warehouse === 'all' || p.warehouse === warehouse)
    .filter(p => category  === 'all' || p.category  === category),
  [items, warehouse, category]);

  const counts = useMemo(() => ({
    all:      baseItems.length,
    critical: baseItems.filter(p => statusOf(p.stock, p.reorderPoint, buffer) === 'critical').length,
    warning:  baseItems.filter(p => statusOf(p.stock, p.reorderPoint, buffer) === 'warning').length,
    ok:       baseItems.filter(p => statusOf(p.stock, p.reorderPoint, buffer) === 'ok').length,
  }), [baseItems, buffer]);

  const filtered = useMemo(() => {
    let list = baseItems;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      list = list.filter(p => statusOf(p.stock, p.reorderPoint, buffer) === statusFilter);
    }
    return [...list].sort((a, b) => {
      const av = a[sortCol]; const bv = b[sortCol];
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [baseItems, search, statusFilter, sortCol, sortDir, buffer]);

  return (
    <div className="page">
      <div className="page-title">Inventory</div>

      <div className="inv-toolbar card">
        <div className="inv-search">
          <MdSearch />
          <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="status-tabs">
          {STATUS_TABS.map(s => (
            <button
              key={s}
              className={`status-tab${statusFilter === s ? ' active' : ''}${s !== 'all' ? ` tab-${s}` : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="tab-count">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card inv-table-wrap">
        {loading ? <SkeletonRows count={8} /> :
         error   ? <ErrorState message={error} onRetry={load} /> :
         filtered.length === 0
           ? <EmptyState title="No products found" desc="Try adjusting your search or filters." />
           : (
          <table className="inv-table">
            <thead>
              <tr>
                {COLS.map(({ key, label }) => (
                  <th key={key} onClick={() => handleSort(key)} className="sortable-th">
                    {label} <SortIcon col={key} sortCol={sortCol} sortDir={sortDir} />
                  </th>
                ))}
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.productId}>
                  <td className="inv-name">{p.name}</td>
                  <td>{p.category}</td>
                  <td className="inv-stock">{p.stock}</td>
                  <td>{p.reorderPoint}</td>
                  <td>{p.warehouse}</td>
                  <td><StatusBadge stock={p.stock} reorderPoint={p.reorderPoint} buffer={buffer} /></td>
                  <td>
                    <button className="icon-btn" onClick={() => setEditing(p)} title="Adjust stock">
                      <MdEdit />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <AdjustModal product={editing} onClose={() => setEditing(null)} onSave={handleSave} />
      )}
    </div>
  );
}
