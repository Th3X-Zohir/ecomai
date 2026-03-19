/**
 * Settlement Configuration Page
 * Merchant escrow/wallet settings: enable/disable, hold period, payout preferences
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settlements } from '../api';
import { PageHeader, Card, Button, FormField, Select, Switch, useToast, PageSkeleton } from '../components/UI';

const fmt = (n) => Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SettlementConfig() {
  const navigate = useNavigate();
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [isEnabled, setIsEnabled] = useState(true);
  const [holdDays, setHoldDays] = useState(3);
  const [autoRelease, setAutoRelease] = useState(true);
  const [minPayout, setMinPayout] = useState(500);
  const [payoutSchedule, setPayoutSchedule] = useState('on_demand');
  const [preferredMethod, setPreferredMethod] = useState('bank_transfer');

  useEffect(() => {
    settlements.getConfig().then(data => {
      setConfig(data);
      setIsEnabled(data.is_enabled !== false);
      setHoldDays(data.hold_days || 3);
      setAutoRelease(data.auto_release !== false);
      setMinPayout(data.min_payout_threshold || 500);
      setPayoutSchedule(data.payout_schedule || 'on_demand');
      setPreferredMethod(data.preferred_method || 'bank_transfer');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await settlements.saveConfig({
        isEnabled,
        holdDays,
        autoRelease,
        minPayoutThreshold: minPayout,
        payoutSchedule,
        preferredMethod,
      });
      toast('Settlement settings saved successfully', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escrow & Settlement"
        description="Configure how your funds are held and released"
        action={
          <Button variant="secondary" onClick={() => navigate('/admin/settlements/ledger')}>
            View Ledger →
          </Button>
        }
      />

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

        <Card>
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Escrow Mode</h3>
                <p className="text-sm text-gray-500 mt-1">
                  When enabled, funds from online payments are held for a configurable period after delivery before becoming available.
                </p>
              </div>
              <div className="ml-4">
                <button
                  type="button"
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {!isEnabled && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Escrow disabled.</strong> Funds from online payments will be immediately available after payment confirmation — no hold period.
                </p>
              </div>
            )}
          </div>
        </Card>

        {isEnabled && (
          <Card>
            <div className="p-6 space-y-6">
              <h3 className="font-semibold text-gray-900">Hold Period</h3>

              <FormField label="Hold Days After Delivery">
                <Select value={holdDays} onChange={e => setHoldDays(Number(e.target.value))}>
                  {[1, 2, 3, 5, 7, 14].map(d => (
                    <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>
                  ))}
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Funds will be held for {holdDays} day{holdDays > 1 ? 's' : ''} after delivery confirmation before auto-release.
                </p>
              </FormField>

              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-800">Auto-Release</h4>
                  <p className="text-sm text-gray-500 mt-0.5">Automatically release held funds after the hold period expires.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoRelease(!autoRelease)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-4 ${autoRelease ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoRelease ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="p-6 space-y-6">
            <h3 className="font-semibold text-gray-900">Payout Preferences</h3>

            <FormField label="Minimum Payout Threshold (BDT)">
              <input type="number" value={minPayout} onChange={e => setMinPayout(Number(e.target.value))} min={0} step={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <p className="text-xs text-gray-500 mt-1">Minimum balance required to request a payout.</p>
            </FormField>

            <FormField label="Payout Schedule">
              <Select value={payoutSchedule} onChange={e => setPayoutSchedule(e.target.value)}>
                <option value="on_demand">On Demand (manual request)</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </FormField>

            <FormField label="Preferred Payout Method">
              <Select value={preferredMethod} onChange={e => setPreferredMethod(e.target.value)}>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
              </Select>
            </FormField>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>Save Settings</Button>
          <Button variant="secondary" type="button" onClick={() => navigate('/admin/earnings')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
