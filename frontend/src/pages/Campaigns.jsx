import { useState, useEffect } from 'react';
import { campaigns } from '../api';
import { PageHeader, Table, Button, Modal, FormField, Input, Select, Textarea, Badge, Card, Pagination, StatCard, SearchInput, Tabs, PageSkeleton, useToast } from '../components/UI';

const CHANNELS = ['email', 'facebook', 'instagram', 'tiktok', 'google_ads', 'sms'];

const channelMeta = {
  email: { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, color: 'indigo' },
  facebook: { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6" /></svg>, color: 'blue' },
  instagram: { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, color: 'pink' },
  tiktok: { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>, color: 'gray' },
  google_ads: { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>, color: 'red' },
  sms: { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>, color: 'emerald' },
};

const bgMap = { indigo: 'bg-primary-100 text-primary-600', blue: 'bg-blue-100 text-blue-600', pink: 'bg-pink-100 text-pink-600', gray: 'bg-gray-100 text-gray-600', red: 'bg-red-100 text-red-600', emerald: 'bg-emerald-100 text-emerald-600' };

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
  const [channelFilter, setChannelFilter] = useState('all');
  const [search, setSearch] = useState('');
  const toast = useToast();

  const load = (p = page, q = search) => {
    setLoading(true);
    campaigns.list({ page: p, limit: 20, search: q || undefined, type: channelFilter !== 'all' ? channelFilter : undefined })
      .then((data) => { setItems(data.items); setTotalPages(data.totalPages); setTotal(data.total); setPage(data.page); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, [channelFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await campaigns.create(form);
      setShowCreate(false);
      setForm({ campaign_name: '', channel: 'email', objective: '', content: { headline: '', body: '', cta: '' } });
      toast('Campaign created!', 'success');
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
      toast('AI draft generated!', 'success');
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  // Stats
  const draftCount = items.filter(c => c.status === 'draft').length;
  const activeCount = items.filter(c => c.status === 'active').length;

  const filteredItems = items;

  const columns = [
    { key: 'campaign_name', label: 'Campaign', render: (r) => {
      const meta = channelMeta[r.channel] || channelMeta.email;
      return (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgMap[meta.color]}`}>
            {meta.icon}
          </div>
          <div>
            <p className="font-medium text-gray-900">{r.campaign_name}</p>
            <p className="text-xs text-gray-500 capitalize">{(r.channel || 'email').replace('_', ' ')}</p>
          </div>
        </div>
      );
    }},
    { key: 'objective', label: 'Objective', render: (r) => (
      <span className="text-sm text-gray-600 truncate block max-w-[200px]">{r.objective || '—'}</span>
    )},
    { key: 'status', label: 'Status', render: (r) => (
      <Badge variant={r.status === 'draft' ? 'warning' : r.status === 'active' ? 'success' : r.status === 'paused' ? 'info' : 'default'} dot>
        {r.status}
      </Badge>
    )},
    { key: 'content', label: 'Headline', render: (r) => (
      <span className="text-xs text-gray-500 truncate block max-w-[180px]">{r.content?.headline || '—'}</span>
    )},
    { key: 'created_at', label: 'Created', render: (r) => (
      <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
    )},
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Marketing Campaigns" description="Create and manage marketing campaigns">
        <Button variant="secondary" onClick={() => setShowAI(true)}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}>
          AI Draft
        </Button>
        <Button onClick={() => setShowCreate(true)}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}>
          New Campaign
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Campaigns" value={total} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
        } />
        <StatCard label="Active" value={activeCount} trend={activeCount > 0 ? 'up' : undefined} trendLabel="Running" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        } />
        <StatCard label="Drafts" value={draftCount} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        } />
      </div>

      {/* AI Result banner */}
      {aiResult && (
        <Card className="mb-6 border-primary-200 bg-gradient-to-r from-primary-50 to-purple-50">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                </div>
                <h3 className="font-semibold text-primary-700">AI Draft Generated</h3>
              </div>
              <button onClick={() => setAiResult(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-white/50 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Headline</p>
                <p className="font-medium text-gray-900">{aiResult.content?.headline}</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Body</p>
                <p className="text-gray-700">{aiResult.content?.body}</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Call to Action</p>
                <p className="font-semibold text-primary-600">{aiResult.content?.cta}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search + Channel filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="sm:w-80">
          <SearchInput value={search} onChange={(v) => { setSearch(v); load(1, v); }} placeholder="Search campaigns..." />
        </div>
      </div>

      {/* Channel filter tabs */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setChannelFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${channelFilter === 'all' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >All ({total})</button>
        {CHANNELS.map(ch => {
          const count = items.filter(c => c.channel === ch).length;
          if (count === 0) return null;
          const meta = channelMeta[ch];
          return (
            <button key={ch} onClick={() => setChannelFilter(ch)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition flex items-center gap-1.5 ${channelFilter === ch ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              {meta.icon}
              <span className="capitalize">{ch.replace('_', ' ')}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <Table columns={columns} data={filteredItems} loading={loading} emptyMessage="No campaigns yet. Create one or try AI draft!" emptyIcon="📣" />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {/* Create Campaign Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Campaign" size="lg">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreate}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <FormField label="Campaign Name">
              <Input value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} placeholder="e.g. Summer Sale 2025" required autoFocus />
            </FormField>
            <FormField label="Channel">
              <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Objective" hint="What do you want this campaign to achieve?">
            <Input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="e.g. Increase holiday sales by 20%" />
          </FormField>

          <div className="mt-2 mb-1">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Campaign Content
            </p>
          </div>
          <FormField label="Headline">
            <Input value={form.content.headline} onChange={(e) => setForm({ ...form, content: { ...form.content, headline: e.target.value } })} placeholder="Catchy headline text" required />
          </FormField>
          <FormField label="Body">
            <Textarea value={form.content.body} onChange={(e) => setForm({ ...form, content: { ...form.content, body: e.target.value } })} placeholder="Campaign message body..." rows={3} required />
          </FormField>
          <FormField label="Call to Action (CTA)">
            <Input value={form.content.cta} onChange={(e) => setForm({ ...form, content: { ...form.content, cta: e.target.value } })} placeholder="e.g. Shop Now, Learn More" />
          </FormField>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Campaign</Button>
          </div>
        </form>
      </Modal>

      {/* AI Draft Modal */}
      <Modal open={showAI} onClose={() => setShowAI(false)} title="Generate AI Campaign Draft">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-primary-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          <p className="text-xs text-primary-700">AI will generate campaign content based on your inputs. You can edit the resulting campaign afterward.</p>
        </div>
        <form onSubmit={handleAIDraft}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <FormField label="Campaign Name">
              <Input value={aiForm.campaign_name} onChange={(e) => setAiForm({ ...aiForm, campaign_name: e.target.value })} required placeholder="e.g. Summer Sale 2025" autoFocus />
            </FormField>
            <FormField label="Channel">
              <Select value={aiForm.channel} onChange={(e) => setAiForm({ ...aiForm, channel: e.target.value })}>
                {CHANNELS.map((ch) => <option key={ch} value={ch}>{ch.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Objective" hint="What should the campaign accomplish?">
            <Input value={aiForm.objective} onChange={(e) => setAiForm({ ...aiForm, objective: e.target.value })} placeholder="e.g. Drive traffic to new product line" />
          </FormField>
          <FormField label="Product Summary" hint="Brief description of what you're promoting">
            <Textarea value={aiForm.productSummary} onChange={(e) => setAiForm({ ...aiForm, productSummary: e.target.value })} placeholder="e.g. Organic coffee beans, premium quality, sustainable sourcing..." rows={3} />
          </FormField>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowAI(false)}>Cancel</Button>
            <Button type="submit" loading={saving}
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}>
              Generate Draft
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
