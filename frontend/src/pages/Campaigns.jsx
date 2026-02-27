import { useState, useEffect } from 'react';
import { campaigns } from '../api';
import { PageHeader, Table, Button, Modal, FormField, Input, Select, Textarea, Badge, Card, Pagination } from '../components/UI';

const CHANNELS = ['email', 'facebook', 'instagram', 'tiktok', 'google_ads', 'sms'];

export default function Campaigns() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [form, setForm] = useState({ campaign_name: '', channel: 'email', objective: '', content: { headline: '', body: '', cta: '' } });
  const [aiForm, setAiForm] = useState({ campaign_name: '', channel: 'email', objective: '', productSummary: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = page) => {
    setLoading(true);
    campaigns.list({ page: p, limit: 20 })
      .then((data) => { setItems(data.items); setTotalPages(data.totalPages); setTotal(data.total); setPage(data.page); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await campaigns.create(form);
      setShowCreate(false);
      setForm({ campaign_name: '', channel: 'email', objective: '', content: { headline: '', body: '', cta: '' } });
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleAIDraft = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const result = await campaigns.generateDraft(aiForm);
      setAiResult(result);
      setShowAI(false);
      setAiForm({ campaign_name: '', channel: 'email', objective: '', productSummary: '' });
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const channelEmoji = (ch) => {
    const map = { email: '📧', facebook: '📘', instagram: '📸', tiktok: '🎵', google_ads: '🔍', sms: '📱' };
    return map[ch] || '📣';
  };

  const columns = [
    { key: 'campaign_name', label: 'Name', render: (r) => <span className="font-medium">{r.campaign_name}</span> },
    { key: 'channel', label: 'Channel', render: (r) => (
      <span className="flex items-center gap-1">{channelEmoji(r.channel)} {r.channel}</span>
    )},
    { key: 'objective', label: 'Objective', render: (r) => r.objective || '—' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'draft' ? 'warning' : r.status === 'active' ? 'success' : 'default'}>{r.status}</Badge> },
    { key: 'content', label: 'Headline', render: (r) => <span className="text-xs text-gray-600 truncate block max-w-xs">{r.content?.headline || '—'}</span> },
    { key: 'created_at', label: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <PageHeader title="Marketing Campaigns" description={`${total} campaign${total !== 1 ? 's' : ''}`}>
        <Button variant="secondary" onClick={() => setShowAI(true)}>🤖 AI Draft</Button>
        <Button onClick={() => setShowCreate(true)}>+ New Campaign</Button>
      </PageHeader>

      {aiResult && (
        <Card className="mb-6">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-success-600">🤖 AI Draft Generated!</h3>
              <button onClick={() => setAiResult(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500">Headline</p><p className="font-medium">{aiResult.content.headline}</p></div>
              <div><p className="text-gray-500">Body</p><p>{aiResult.content.body}</p></div>
              <div><p className="text-gray-500">CTA</p><p className="font-medium text-primary-600">{aiResult.content.cta}</p></div>
            </div>
          </div>
        </Card>
      )}

      <Table columns={columns} data={items} emptyMessage="No campaigns yet. Create one or try AI draft!" />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {/* Manual Create */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Campaign">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreate}>
          <FormField label="Campaign Name"><Input value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} required /></FormField>
          <FormField label="Channel">
            <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              {CHANNELS.map((ch) => <option key={ch} value={ch}>{channelEmoji(ch)} {ch}</option>)}
            </Select>
          </FormField>
          <FormField label="Objective"><Input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="e.g. Increase holiday sales" /></FormField>
          <FormField label="Headline"><Input value={form.content.headline} onChange={(e) => setForm({ ...form, content: { ...form.content, headline: e.target.value } })} required /></FormField>
          <FormField label="Body"><Textarea value={form.content.body} onChange={(e) => setForm({ ...form, content: { ...form.content, body: e.target.value } })} required /></FormField>
          <FormField label="CTA"><Input value={form.content.cta} onChange={(e) => setForm({ ...form, content: { ...form.content, cta: e.target.value } })} placeholder="e.g. Shop Now" /></FormField>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Campaign'}</Button>
          </div>
        </form>
      </Modal>

      {/* AI Draft */}
      <Modal open={showAI} onClose={() => setShowAI(false)} title="🤖 Generate AI Campaign Draft">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleAIDraft}>
          <FormField label="Campaign Name"><Input value={aiForm.campaign_name} onChange={(e) => setAiForm({ ...aiForm, campaign_name: e.target.value })} required placeholder="e.g. Summer Sale 2025" /></FormField>
          <FormField label="Channel">
            <Select value={aiForm.channel} onChange={(e) => setAiForm({ ...aiForm, channel: e.target.value })}>
              {CHANNELS.map((ch) => <option key={ch} value={ch}>{channelEmoji(ch)} {ch}</option>)}
            </Select>
          </FormField>
          <FormField label="Objective"><Input value={aiForm.objective} onChange={(e) => setAiForm({ ...aiForm, objective: e.target.value })} placeholder="e.g. Drive coffee sales" /></FormField>
          <FormField label="Product Summary"><Textarea value={aiForm.productSummary} onChange={(e) => setAiForm({ ...aiForm, productSummary: e.target.value })} placeholder="Brief description of products to promote..." /></FormField>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" type="button" onClick={() => setShowAI(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Generating...' : '🤖 Generate Draft'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
