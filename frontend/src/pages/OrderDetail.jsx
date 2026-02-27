import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orders, payments, deliveries } from '../api';
import { PageHeader, Card, Button, Badge, Modal, FormField, Input, Select, Table, ProgressBar, PageSkeleton, useToast } from '../components/UI';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [orderPayments, setOrderPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [status, setStatus] = useState('');
  const [paymentForm, setPaymentForm] = useState({ amount: '', provider: 'manual' });
  const [deliveryForm, setDeliveryForm] = useState({
    provider: 'internal',
    pickup_address: { street: '', city: '', zip: '' },
    dropoff_address: { street: '', city: '', zip: '' },
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const o = await orders.get(id);
      setOrder(o);
      setStatus(o.status);
      const p = await payments.list(id);
      setOrderPayments(p.items);
    } catch { navigate('/admin/orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const updated = await orders.updateStatus(id, status);
      setOrder({ ...order, ...updated });
      setShowStatusModal(false);
      toast('Order status updated!', 'success');
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await orders.createPayment(id, { amount: Number(paymentForm.amount), provider: paymentForm.provider });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', provider: 'manual' });
      toast('Payment recorded!', 'success');
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelivery = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await orders.createDelivery(id, deliveryForm);
      setShowDeliveryModal(false);
      toast('Delivery requested!', 'success');
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  if (loading) return <PageSkeleton />;
  if (!order) return null;

  const statusVariant = (s) => {
    const map = { pending: 'warning', confirmed: 'info', processing: 'info', shipped: 'purple', delivered: 'success', cancelled: 'danger' };
    return map[s] || 'default';
  };

  const totalPaid = orderPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalAmount = Number(order.total_amount);
  const paymentPct = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const currentIdx = orderStatuses.indexOf(order.status);

  const itemColumns = [
    { key: 'item_name', label: 'Product', render: (r) => <span className="font-medium text-gray-900">{r.item_name}</span> },
    { key: 'quantity', label: 'Qty', render: (r) => <span className="text-center">{r.quantity}</span> },
    { key: 'unit_price', label: 'Unit Price', render: (r) => <span className="text-gray-600">৳{Number(r.unit_price).toFixed(2)}</span> },
    { key: 'line_total', label: 'Total', render: (r) => <span className="font-semibold text-gray-900">৳{Number(r.line_total).toFixed(2)}</span> },
  ];

  const paymentColumns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.id.slice(0, 10)}</span> },
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold">৳{Number(r.amount).toFixed(2)}</span> },
    { key: 'provider', label: 'Provider', render: (r) => <Badge variant="default">{r.provider}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'captured' ? 'success' : 'warning'} dot>{r.status}</Badge> },
    { key: 'created_at', label: 'Date', render: (r) => <span className="text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span> },
  ];

  return (
    <div>
      <PageHeader
        title={`Order #${(id || '').slice(-8)}`}
        breadcrumbs={[{ label: 'Orders', href: '/admin/orders' }, { label: `#${(id || '').slice(-8)}` }]}
      >
        <Button variant="secondary" size="sm" onClick={() => setShowStatusModal(true)}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}>
          Update Status
        </Button>
        <Button variant="success" size="sm" onClick={() => setShowPaymentModal(true)}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
          Record Payment
        </Button>
        <Button size="sm" onClick={() => setShowDeliveryModal(true)}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>}>
          Request Delivery
        </Button>
      </PageHeader>

      {/* Status pipeline */}
      {order.status !== 'cancelled' && (
        <Card className="mb-6">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Order Progress</h3>
              <Badge variant={statusVariant(order.status)} dot>{order.status}</Badge>
            </div>
            <div className="flex items-center gap-1">
              {orderStatuses.filter(s => s !== 'cancelled').map((s, i) => {
                const isDone = i <= currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={s} className="flex-1 flex flex-col items-center">
                    <div className={`w-full h-1.5 rounded-full ${isDone ? 'bg-primary-500' : 'bg-gray-200'}`} />
                    <span className={`text-[10px] mt-1.5 font-medium capitalize ${isCurrent ? 'text-primary-600' : isDone ? 'text-gray-600' : 'text-gray-400'}`}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">৳{totalAmount.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Payment Progress</p>
            <p className="text-2xl font-bold text-emerald-600">৳{totalPaid.toFixed(2)}</p>
            <div className="mt-2">
              <ProgressBar value={totalPaid} max={totalAmount} color={paymentPct >= 100 ? 'emerald' : 'indigo'} />
              <p className="text-[10px] text-gray-500 mt-1">{paymentPct.toFixed(0)}% of ৳{totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Customer</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{order.customer_email}</p>
            <p className="text-xs text-gray-500 mt-1">Ordered {new Date(order.created_at).toLocaleDateString()}</p>
          </div>
        </Card>
      </div>

      {/* Order details */}
      <Card className="mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Order Breakdown</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Subtotal</p>
              <p className="font-semibold text-gray-900">৳{Number(order.subtotal).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Tax</p>
              <p className="font-semibold text-gray-900">৳{Number(order.tax_amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Shipping</p>
              <p className="font-semibold text-gray-900">৳{Number(order.shipping_amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Discount</p>
              <p className="font-semibold text-red-600">-৳{Number(order.discount_amount).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Items */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Items</h2>
      </div>
      <div className="mb-8">
        <Table columns={itemColumns} data={order.items || []} emptyMessage="No items" emptyIcon="📦" />
      </div>

      {/* Payments */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
        <Button variant="ghost" size="sm" onClick={() => setShowPaymentModal(true)}>+ Record Payment</Button>
      </div>
      <Table columns={paymentColumns} data={orderPayments} emptyMessage="No payments recorded yet" emptyIcon="💳" />

      {/* Status Modal */}
      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Order Status" size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleStatusUpdate}>
          <FormField label="New Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {orderStatuses.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Update Status</Button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment" size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handlePayment}>
          <FormField label="Amount (৳)" hint={`Order total: ৳${totalAmount.toFixed(2)}`}>
            <Input type="number" step="0.01" min="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder={totalAmount.toFixed(2)} required />
          </FormField>
          <FormField label="Payment Provider">
            <Select value={paymentForm.provider} onChange={(e) => setPaymentForm({ ...paymentForm, provider: e.target.value })}>
              <option value="manual">Manual</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="sslcommerz">SSLCommerz</option>
              <option value="cash">Cash</option>
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button variant="success" type="submit" loading={saving}>Record Payment</Button>
          </div>
        </form>
      </Modal>

      {/* Delivery Modal */}
      <Modal open={showDeliveryModal} onClose={() => setShowDeliveryModal(false)} title="Request Delivery">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleDelivery}>
          <FormField label="Delivery Provider">
            <Select value={deliveryForm.provider} onChange={(e) => setDeliveryForm({ ...deliveryForm, provider: e.target.value })}>
              <option value="internal">Internal</option>
              <option value="fedex">FedEx</option>
              <option value="ups">UPS</option>
              <option value="dhl">DHL</option>
            </Select>
          </FormField>

          <div className="mt-4 mb-3">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Pickup Address
            </p>
            <FormField><Input value={deliveryForm.pickup_address.street} onChange={(e) => setDeliveryForm({ ...deliveryForm, pickup_address: { ...deliveryForm.pickup_address, street: e.target.value } })} placeholder="Street address" required /></FormField>
            <div className="grid grid-cols-2 gap-2">
              <Input value={deliveryForm.pickup_address.city} onChange={(e) => setDeliveryForm({ ...deliveryForm, pickup_address: { ...deliveryForm.pickup_address, city: e.target.value } })} placeholder="City" required />
              <Input value={deliveryForm.pickup_address.zip} onChange={(e) => setDeliveryForm({ ...deliveryForm, pickup_address: { ...deliveryForm.pickup_address, zip: e.target.value } })} placeholder="ZIP Code" required />
            </div>
          </div>

          <div className="mt-4 mb-3">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Dropoff Address
            </p>
            <FormField><Input value={deliveryForm.dropoff_address.street} onChange={(e) => setDeliveryForm({ ...deliveryForm, dropoff_address: { ...deliveryForm.dropoff_address, street: e.target.value } })} placeholder="Street address" required /></FormField>
            <div className="grid grid-cols-2 gap-2">
              <Input value={deliveryForm.dropoff_address.city} onChange={(e) => setDeliveryForm({ ...deliveryForm, dropoff_address: { ...deliveryForm.dropoff_address, city: e.target.value } })} placeholder="City" required />
              <Input value={deliveryForm.dropoff_address.zip} onChange={(e) => setDeliveryForm({ ...deliveryForm, dropoff_address: { ...deliveryForm.dropoff_address, zip: e.target.value } })} placeholder="ZIP Code" required />
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowDeliveryModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Request Delivery</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
