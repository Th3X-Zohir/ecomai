import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orders, payments, deliveries } from '../api';
import { PageHeader, Card, Button, Badge, Modal, FormField, Input, Select, Table } from '../components/UI';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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
    } catch {
      navigate('/admin/orders');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const updated = await orders.updateStatus(id, status);
      setOrder({ ...order, ...updated });
      setShowStatusModal(false);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await orders.createPayment(id, { amount: Number(paymentForm.amount), provider: paymentForm.provider });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', provider: 'manual' });
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelivery = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await orders.createDelivery(id, deliveryForm);
      setShowDeliveryModal(false);
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  if (!order) return null;

  const statusVariant = (s) => {
    const map = { pending: 'warning', confirmed: 'info', processing: 'info', shipped: 'purple', delivered: 'success', cancelled: 'danger' };
    return map[s] || 'default';
  };

  const totalPaid = orderPayments.reduce((s, p) => s + Number(p.amount), 0);

  const itemColumns = [
    { key: 'item_name', label: 'Product', render: (r) => <span className="font-medium">{r.item_name}</span> },
    { key: 'quantity', label: 'Qty' },
    { key: 'unit_price', label: 'Unit Price', render: (r) => `$${Number(r.unit_price).toFixed(2)}` },
    { key: 'line_total', label: 'Total', render: (r) => <span className="font-semibold">${Number(r.line_total).toFixed(2)}</span> },
  ];

  const paymentColumns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 12)}...</span> },
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold">${Number(r.amount).toFixed(2)}</span> },
    { key: 'provider', label: 'Provider' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant="success">{r.status}</Badge> },
    { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader title={`Order ${order.id.slice(0, 12)}...`}>
        <Button variant="secondary" onClick={() => navigate('/admin/orders')}>← Back</Button>
        <Button variant="secondary" onClick={() => setShowStatusModal(true)}>Update Status</Button>
        <Button variant="success" onClick={() => setShowPaymentModal(true)}>Record Payment</Button>
        <Button onClick={() => setShowDeliveryModal(true)}>Request Delivery</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="p-5">
            <h3 className="text-sm text-gray-500 mb-1">Status</h3>
            <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <h3 className="text-sm text-gray-500 mb-1">Total</h3>
            <p className="text-2xl font-bold">${Number(order.total_amount).toFixed(2)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <h3 className="text-sm text-gray-500 mb-1">Payment</h3>
            <p className="text-2xl font-bold text-success-600">${totalPaid.toFixed(2)}</p>
            <p className="text-xs text-gray-500">of ${Number(order.total_amount).toFixed(2)}</p>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="p-5">
          <h3 className="font-semibold mb-3">Order Info</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <p className="text-gray-500">Customer</p><p className="font-medium">{order.customer_email}</p>
            <p className="text-gray-500">Date</p><p>{new Date(order.created_at).toLocaleString()}</p>
            <p className="text-gray-500">Subtotal</p><p>${Number(order.subtotal).toFixed(2)}</p>
            <p className="text-gray-500">Tax</p><p>${Number(order.tax_amount).toFixed(2)}</p>
            <p className="text-gray-500">Shipping</p><p>${Number(order.shipping_amount).toFixed(2)}</p>
            <p className="text-gray-500">Discount</p><p>-${Number(order.discount_amount).toFixed(2)}</p>
          </div>
        </div>
      </Card>

      <h2 className="text-lg font-semibold mb-3">Items</h2>
      <div className="mb-6">
        <Table columns={itemColumns} data={order.items || []} emptyMessage="No items" />
      </div>

      <h2 className="text-lg font-semibold mb-3">Payments</h2>
      <Table columns={paymentColumns} data={orderPayments} emptyMessage="No payments recorded" />

      {/* Status Modal */}
      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Order Status">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleStatusUpdate}>
          <FormField label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update'}</Button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handlePayment}>
          <FormField label="Amount">
            <Input type="number" step="0.01" min="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder={order.total_amount} required />
          </FormField>
          <FormField label="Provider">
            <Select value={paymentForm.provider} onChange={(e) => setPaymentForm({ ...paymentForm, provider: e.target.value })}>
              <option value="manual">Manual</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="cash">Cash</option>
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" type="button" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button variant="success" type="submit" disabled={saving}>{saving ? 'Processing...' : 'Record Payment'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delivery Modal */}
      <Modal open={showDeliveryModal} onClose={() => setShowDeliveryModal(false)} title="Request Delivery">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleDelivery}>
          <FormField label="Provider">
            <Select value={deliveryForm.provider} onChange={(e) => setDeliveryForm({ ...deliveryForm, provider: e.target.value })}>
              <option value="internal">Internal</option>
              <option value="fedex">FedEx</option>
              <option value="ups">UPS</option>
              <option value="dhl">DHL</option>
            </Select>
          </FormField>
          <p className="text-sm font-medium text-gray-700 mb-2">Pickup Address</p>
          <FormField><Input value={deliveryForm.pickup_address.street} onChange={(e) => setDeliveryForm({ ...deliveryForm, pickup_address: { ...deliveryForm.pickup_address, street: e.target.value } })} placeholder="Street" required /></FormField>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Input value={deliveryForm.pickup_address.city} onChange={(e) => setDeliveryForm({ ...deliveryForm, pickup_address: { ...deliveryForm.pickup_address, city: e.target.value } })} placeholder="City" required />
            <Input value={deliveryForm.pickup_address.zip} onChange={(e) => setDeliveryForm({ ...deliveryForm, pickup_address: { ...deliveryForm.pickup_address, zip: e.target.value } })} placeholder="ZIP" required />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-2">Dropoff Address</p>
          <FormField><Input value={deliveryForm.dropoff_address.street} onChange={(e) => setDeliveryForm({ ...deliveryForm, dropoff_address: { ...deliveryForm.dropoff_address, street: e.target.value } })} placeholder="Street" required /></FormField>
          <div className="grid grid-cols-2 gap-2">
            <Input value={deliveryForm.dropoff_address.city} onChange={(e) => setDeliveryForm({ ...deliveryForm, dropoff_address: { ...deliveryForm.dropoff_address, city: e.target.value } })} placeholder="City" required />
            <Input value={deliveryForm.dropoff_address.zip} onChange={(e) => setDeliveryForm({ ...deliveryForm, dropoff_address: { ...deliveryForm.dropoff_address, zip: e.target.value } })} placeholder="ZIP" required />
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" type="button" onClick={() => setShowDeliveryModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Request Delivery'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
