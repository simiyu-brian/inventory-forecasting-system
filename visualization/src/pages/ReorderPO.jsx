import { useEffect, useState } from 'react';
import { getReorderSuggestions, getPurchaseOrders, createPurchaseOrder } from '../api/api';
import { SkeletonRows, EmptyState, ErrorState } from '../components/ui/States';
import { MdAddShoppingCart } from 'react-icons/md';
import './ReorderPO.css';

const PO_STATUS_CLASS = { pending: 'warning', confirmed: 'ok', shipped: 'ok' };

export default function ReorderPO() {
  const [suggestions, setSuggestions] = useState([]);
  const [pos, setPos]               = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const load = () => {
    setLoading(true); setError(null);
    Promise.all([getReorderSuggestions(), getPurchaseOrders()])
      .then(([s, p]) => { setSuggestions(s); setPos(p); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (s) => {
    const po = await createPurchaseOrder({
      productId: s.productId, productName: s.name,
      supplierName: s.supplierName, qty: s.suggestedQty,
      expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });
    setPos(prev => [po, ...prev]);
  };

  return (
    <div className="page">
      <div className="page-title">Reorder & Purchase Orders</div>

      {loading ? <SkeletonRows count={6} /> :
       error   ? <ErrorState message={error} onRetry={load} /> :
      <>
        <div className="card" style={{ marginBottom: '.875rem', padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem .5rem', fontWeight: 600, fontSize: '.85rem' }}>Reorder Suggestions</div>
          {suggestions.length === 0 ? <EmptyState title="No reorder suggestions" /> :
          <table className="ro-table">
            <thead><tr><th>Product</th><th>Stock</th><th>Reorder Point</th><th>Suggest Qty</th><th>Supplier</th><th></th></tr></thead>
            <tbody>
              {suggestions.map(s => (
                <tr key={s.productId}>
                  <td>{s.name}</td>
                  <td>{s.currentStock}</td>
                  <td>{s.reorderPoint}</td>
                  <td><strong>{s.suggestedQty}</strong></td>
                  <td>{s.supplierName}</td>
                  <td>
                    <button className="btn-create-po" onClick={() => handleCreate(s)}>
                      <MdAddShoppingCart /> Create Purchase Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem .5rem', fontWeight: 600, fontSize: '.85rem' }}>Open Purchase Orders</div>
          {pos.length === 0 ? <EmptyState title="No purchase orders" /> :
          <table className="ro-table">
            <thead><tr><th>Product</th><th>Supplier</th><th>Qty</th><th>Status</th><th>Expected</th></tr></thead>
            <tbody>
              {pos.map(po => (
                <tr key={po.poId}>
                  <td>{po.productName}</td>
                  <td>{po.supplierName}</td>
                  <td>{po.qty}</td>
                  <td><span className={`badge badge-${PO_STATUS_CLASS[po.status] || 'warning'}`}>{po.status}</span></td>
                  <td>{po.expectedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>
      </>}
    </div>
  );
}
