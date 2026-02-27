import { useState, useEffect, useRef } from 'react';
import { websiteSettings, shops } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { templates, resolveTokens } from '../storefront/templates';
import { PageHeader, Card, Button, FormField, Input, Textarea } from '../components/UI';

const TEMPLATE_LIST = Object.values(templates);

export default function WebsiteSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('theme');

  /* ── Form state aligned with backend DB columns ── */
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [tokenOverrides, setTokenOverrides] = useState({});
  const [headerConfig, setHeaderConfig] = useState('{}');
  const [footerConfig, setFooterConfig] = useState('{}');
  const [customCss, setCustomCss] = useState('');
  const [customJs, setCustomJs] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCta, setHeroCta] = useState('');
  const [featuredTitle, setFeaturedTitle] = useState('');

  /* ── New expanded settings state ── */
  const [socialLinks, setSocialLinks] = useState({ facebook: '', instagram: '', twitter: '', tiktok: '', youtube: '', whatsapp: '' });
  const [businessInfo, setBusinessInfo] = useState({ phone: '', email: '', address: '', whatsapp: '', hours: '' });
  const [announcement, setAnnouncement] = useState({ enabled: false, text: '', link: '', bg_color: '#4f46e5', text_color: '#ffffff' });
  const [storePolicies, setStorePolicies] = useState({ return_policy: '', privacy_policy: '', terms: '', about_us: '' });
  const [trustBadges, setTrustBadges] = useState([
    { icon: '🔒', title: 'Secure Checkout', text: '100% secure payment' },
    { icon: '🚀', title: 'Fast Shipping', text: 'Free delivery on orders over $50' },
    { icon: '💬', title: '24/7 Support', text: 'Dedicated customer support' },
  ]);

  const iframeRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await websiteSettings.get();
        setSettings(data);

        /* Map DB columns → local form state */
        setSelectedTemplate(data.template || 'classic');
        setTokenOverrides(data.theme || {});
        setHeaderConfig(JSON.stringify(data.header || {}, null, 2));
        setFooterConfig(JSON.stringify(data.footer || {}, null, 2));
        setCustomCss(data.custom_css || '');
        setCustomJs(data.custom_js || '');

        const seo = data.seo_defaults || {};
        setSeoTitle(seo.title || '');
        setSeoDescription(seo.description || '');

        const hp = data.homepage || {};
        setHeroHeadline(hp?.hero?.headline || hp?.hero?.title || '');
        setHeroSubtitle(hp?.hero?.subtitle || '');
        setHeroCta(hp?.hero?.cta || '');
        setFeaturedTitle(hp?.featured_title || '');

        /* Load new expanded settings */
        const sl = data.social_links || {};
        setSocialLinks({ facebook: sl.facebook || '', instagram: sl.instagram || '', twitter: sl.twitter || '', tiktok: sl.tiktok || '', youtube: sl.youtube || '', whatsapp: sl.whatsapp || '' });
        const bi = data.business_info || {};
        setBusinessInfo({ phone: bi.phone || '', email: bi.email || '', address: bi.address || '', whatsapp: bi.whatsapp || '', hours: bi.hours || '' });
        const ann = data.announcement || {};
        setAnnouncement({ enabled: !!ann.enabled, text: ann.text || '', link: ann.link || '', bg_color: ann.bg_color || '#4f46e5', text_color: ann.text_color || '#ffffff' });
        const sp = data.store_policies || {};
        setStorePolicies({ return_policy: sp.return_policy || '', privacy_policy: sp.privacy_policy || '', terms: sp.terms || '', about_us: sp.about_us || '' });
        if (data.trust_badges && Array.isArray(data.trust_badges) && data.trust_badges.length > 0) setTrustBadges(data.trust_badges);

        if (user.role !== 'super_admin') {
          const s = await shops.me();
          setShop(s);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    setSuccess('');
    try {
      /* Build patch using EXACT backend DB column names */
      const patch = {
        template: selectedTemplate,
        theme: tokenOverrides,
        header: JSON.parse(headerConfig || '{}'),
        footer: JSON.parse(footerConfig || '{}'),
        homepage: {
          hero: {
            headline: heroHeadline || undefined,
            subtitle: heroSubtitle || undefined,
            cta: heroCta || undefined,
          },
          featured_title: featuredTitle || undefined,
        },
        custom_css: customCss || null,
        custom_js: customJs || null,
        seo_defaults: {
          title: seoTitle || undefined,
          description: seoDescription || undefined,
        },
        social_links: socialLinks,
        business_info: businessInfo,
        announcement: announcement,
        store_policies: storePolicies,
        trust_badges: trustBadges,
      };
      const updated = await websiteSettings.update(patch);
      setSettings(updated);
      setSuccess('Published! Your storefront is now updated.');
      setTimeout(() => setSuccess(''), 5000);
      if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const updateToken = (key, value) => setTokenOverrides((prev) => ({ ...prev, [key]: value }));
  const resetToken = (key) => setTokenOverrides((prev) => { const n = { ...prev }; delete n[key]; return n; });

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-4 w-64 bg-gray-100 rounded" />
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 h-40" />)}
          </div>
          <div className="xl:col-span-2"><div className="bg-white rounded-xl border border-gray-200 h-96" /></div>
        </div>
      </div>
    );
  }

  const currentDefaults = templates[selectedTemplate]?.defaults || templates.classic.defaults;
  const resolved = resolveTokens(selectedTemplate, tokenOverrides);
  const storeUrl = shop ? `/store/${shop.slug}` : null;
  const overrideCount = Object.keys(tokenOverrides).length;

  const tabs = [
    { id: 'theme', label: 'Template', icon: '🎨' },
    { id: 'colors', label: 'Colors & Fonts', icon: '🖌️' },
    { id: 'homepage', label: 'Homepage', icon: '🏠' },
    { id: 'announcement', label: 'Announcement', icon: '📢' },
    { id: 'social', label: 'Social & Contact', icon: '🌐' },
    { id: 'policies', label: 'Policies', icon: '📜' },
    { id: 'trust', label: 'Trust Badges', icon: '🛡️' },
    { id: 'seo', label: 'SEO', icon: '🔍' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' },
  ];

  const COLOR_TOKENS = [
    { key: 'primary', label: 'Primary' }, { key: 'secondary', label: 'Secondary' },
    { key: 'accent', label: 'Accent' }, { key: 'bg', label: 'Background' },
    { key: 'surface', label: 'Surface' }, { key: 'text', label: 'Text' },
    { key: 'textMuted', label: 'Muted Text' }, { key: 'border', label: 'Border' },
    { key: 'headerBg', label: 'Header Bg' }, { key: 'headerText', label: 'Header Text' },
    { key: 'footerBg', label: 'Footer Bg' }, { key: 'footerText', label: 'Footer Text' },
  ];

  return (
    <div>
      <PageHeader title="Website Settings" description="Customize your storefront appearance and content">
        <div className="flex items-center gap-2">
          {storeUrl && (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Preview
            </a>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Publishing...</span> : 'Publish Changes'}
          </Button>
        </div>
      </PageHeader>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-3">
          <span className="text-lg">⚠️</span><div className="flex-1">{error}</div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center gap-3">
          <span className="text-lg">✅</span><div className="flex-1">{success}</div>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-600">✕</button>
        </div>
      )}

      {storeUrl && (
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl flex items-center gap-3">
          <span className="text-xl">🌐</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-indigo-800">Public Storefront</p>
            <p className="text-xs text-indigo-600 font-mono truncate">{window.location.origin}{storeUrl}</p>
          </div>
          <button onClick={() => navigator.clipboard.writeText(window.location.origin + storeUrl)}
            className="text-indigo-600 hover:text-indigo-700 text-xs font-medium px-3 py-1.5 bg-white border border-indigo-200 rounded-lg transition hover:shadow-sm">
            Copy URL
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">

          {/* ── Template Selection ── */}
          {activeTab === 'theme' && (
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Choose a Template</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Pick a style. Customize further in Colors & Fonts.</p>
                  </div>
                  {overrideCount > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">{overrideCount} override{overrideCount > 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {TEMPLATE_LIST.map(tmpl => (
                    <button key={tmpl.id}
                      onClick={() => { setSelectedTemplate(tmpl.id); setTokenOverrides({}); }}
                      className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                        selectedTemplate === tmpl.id ? 'border-indigo-500 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-200' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}>
                      <div className="flex gap-1.5 mb-3">
                        {[tmpl.defaults.primary, tmpl.defaults.secondary, tmpl.defaults.accent, tmpl.defaults.bg, tmpl.defaults.surface].map((c, i) => (
                          <div key={i} className="w-7 h-7 rounded-lg border border-gray-200 shadow-sm" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <h4 className="font-semibold text-sm text-gray-900">{tmpl.name}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tmpl.description}</p>
                      {selectedTemplate === tmpl.id && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ── Colors & Typography ── */}
          {activeTab === 'colors' && (
            <>
              <Card>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Color Palette</h3>
                      <p className="text-xs text-gray-500">Override any template color. Click Reset to revert.</p>
                    </div>
                    {overrideCount > 0 && (
                      <button onClick={() => setTokenOverrides({})} className="text-xs text-gray-500 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50">Reset All</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {COLOR_TOKENS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition group">
                        <input type="color" value={resolved[key] || '#000000'} onChange={e => updateToken(key, e.target.value)}
                          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 shadow-sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700">{label}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{resolved[key]}</p>
                        </div>
                        {tokenOverrides[key] && (
                          <button onClick={() => resetToken(key)} className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 hover:text-red-500 transition-all" title="Reset">↺</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Typography & Shapes</h3>
                  <p className="text-xs text-gray-500 mb-4">All fields optional — leave blank to use template defaults.</p>
                  <div className="space-y-3">
                    <FormField label="Font Family">
                      <Input value={tokenOverrides.fontFamily || ''} onChange={e => updateToken('fontFamily', e.target.value)} placeholder={currentDefaults.fontFamily} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Border Radius"><Input value={tokenOverrides.radius || ''} onChange={e => updateToken('radius', e.target.value)} placeholder={currentDefaults.radius} /></FormField>
                      <FormField label="Button Radius"><Input value={tokenOverrides.buttonRadius || ''} onChange={e => updateToken('buttonRadius', e.target.value)} placeholder={currentDefaults.buttonRadius} /></FormField>
                    </div>
                    <FormField label="Hero Gradient"><Input value={tokenOverrides.heroGradient || ''} onChange={e => updateToken('heroGradient', e.target.value)} placeholder={currentDefaults.heroGradient} /></FormField>
                    <FormField label="Card Shadow"><Input value={tokenOverrides.cardShadow || ''} onChange={e => updateToken('cardShadow', e.target.value)} placeholder={currentDefaults.cardShadow} /></FormField>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ── Homepage Content ── */}
          {activeTab === 'homepage' && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Homepage Content</h3>
                <p className="text-xs text-gray-500 mb-4">Customize hero and featured products section. Leave blank for default text.</p>
                <div className="space-y-3">
                  <FormField label="Hero Headline"><Input value={heroHeadline} onChange={e => setHeroHeadline(e.target.value)} placeholder={`Welcome to ${shop?.name || 'Your Store'}`} /></FormField>
                  <FormField label="Hero Subtitle"><Input value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} placeholder="Discover our curated collection of premium products." /></FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Call-to-Action"><Input value={heroCta} onChange={e => setHeroCta(e.target.value)} placeholder="Shop Now" /></FormField>
                    <FormField label="Featured Section Title"><Input value={featuredTitle} onChange={e => setFeaturedTitle(e.target.value)} placeholder="Featured Products" /></FormField>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ── Announcement Bar ── */}
          {activeTab === 'announcement' && (
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Announcement Bar</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Show a banner at the top of your store for sales, announcements, etc.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={announcement.enabled} onChange={e => setAnnouncement({...announcement, enabled: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div className="space-y-3">
                  <FormField label="Announcement Text">
                    <Input value={announcement.text} onChange={e => setAnnouncement({...announcement, text: e.target.value})} placeholder="🎉 Free shipping on orders over $50! Use code SHIP50" />
                  </FormField>
                  <FormField label="Link (optional)">
                    <Input value={announcement.link} onChange={e => setAnnouncement({...announcement, link: e.target.value})} placeholder="/products or https://..." />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Background Color">
                      <div className="flex items-center gap-2">
                        <input type="color" value={announcement.bg_color} onChange={e => setAnnouncement({...announcement, bg_color: e.target.value})} className="w-9 h-9 rounded-lg border cursor-pointer" />
                        <Input value={announcement.bg_color} onChange={e => setAnnouncement({...announcement, bg_color: e.target.value})} />
                      </div>
                    </FormField>
                    <FormField label="Text Color">
                      <div className="flex items-center gap-2">
                        <input type="color" value={announcement.text_color} onChange={e => setAnnouncement({...announcement, text_color: e.target.value})} className="w-9 h-9 rounded-lg border cursor-pointer" />
                        <Input value={announcement.text_color} onChange={e => setAnnouncement({...announcement, text_color: e.target.value})} />
                      </div>
                    </FormField>
                  </div>
                </div>
                {announcement.enabled && announcement.text && (
                  <div className="mt-4 p-3 rounded-lg text-center text-sm font-medium" style={{ backgroundColor: announcement.bg_color, color: announcement.text_color }}>
                    {announcement.text}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ── Social & Contact ── */}
          {activeTab === 'social' && (
            <>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Social Media Links</h3>
                  <p className="text-xs text-gray-500 mb-4">Add your social profiles. Shown in the storefront footer and contact section.</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="📘 Facebook"><Input value={socialLinks.facebook} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} placeholder="https://facebook.com/yourpage" /></FormField>
                      <FormField label="📸 Instagram"><Input value={socialLinks.instagram} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} placeholder="https://instagram.com/yourprofile" /></FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="🐦 Twitter / X"><Input value={socialLinks.twitter} onChange={e => setSocialLinks({...socialLinks, twitter: e.target.value})} placeholder="https://x.com/yourhandle" /></FormField>
                      <FormField label="🎵 TikTok"><Input value={socialLinks.tiktok} onChange={e => setSocialLinks({...socialLinks, tiktok: e.target.value})} placeholder="https://tiktok.com/@yourhandle" /></FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="📺 YouTube"><Input value={socialLinks.youtube} onChange={e => setSocialLinks({...socialLinks, youtube: e.target.value})} placeholder="https://youtube.com/@yourchannel" /></FormField>
                      <FormField label="💬 WhatsApp"><Input value={socialLinks.whatsapp} onChange={e => setSocialLinks({...socialLinks, whatsapp: e.target.value})} placeholder="+880XXXXXXXXXX" /></FormField>
                    </div>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Business Contact Info</h3>
                  <p className="text-xs text-gray-500 mb-4">Shown on your storefront for customer trust. Also enables a floating contact button.</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Phone"><Input value={businessInfo.phone} onChange={e => setBusinessInfo({...businessInfo, phone: e.target.value})} placeholder="+880 1XXX XXXXXX" /></FormField>
                      <FormField label="Email"><Input value={businessInfo.email} onChange={e => setBusinessInfo({...businessInfo, email: e.target.value})} placeholder="hello@yourshop.com" /></FormField>
                    </div>
                    <FormField label="WhatsApp Number (for floating chat button)">
                      <Input value={businessInfo.whatsapp} onChange={e => setBusinessInfo({...businessInfo, whatsapp: e.target.value})} placeholder="+880XXXXXXXXXX (with country code)" />
                    </FormField>
                    <FormField label="Business Address"><Input value={businessInfo.address} onChange={e => setBusinessInfo({...businessInfo, address: e.target.value})} placeholder="123 Main St, Dhaka, Bangladesh" /></FormField>
                    <FormField label="Business Hours"><Input value={businessInfo.hours} onChange={e => setBusinessInfo({...businessInfo, hours: e.target.value})} placeholder="Mon-Fri: 9am-6pm, Sat: 10am-4pm" /></FormField>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ── Store Policies ── */}
          {activeTab === 'policies' && (
            <>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Store Policies</h3>
                  <p className="text-xs text-gray-500 mb-4">These build customer trust. Shown as links in your storefront footer and dedicated pages.</p>
                  <div className="space-y-4">
                    <FormField label="About Us" hint="Tell customers your story">
                      <Textarea value={storePolicies.about_us} onChange={e => setStorePolicies({...storePolicies, about_us: e.target.value})} placeholder="We are a small business passionate about..." className="!h-24" />
                    </FormField>
                    <FormField label="Return & Refund Policy" hint="Helps customers feel safe purchasing">
                      <Textarea value={storePolicies.return_policy} onChange={e => setStorePolicies({...storePolicies, return_policy: e.target.value})} placeholder="We offer a 30-day return policy on all unused items..." className="!h-24" />
                    </FormField>
                    <FormField label="Privacy Policy" hint="Required for customer data protection">
                      <Textarea value={storePolicies.privacy_policy} onChange={e => setStorePolicies({...storePolicies, privacy_policy: e.target.value})} placeholder="We respect your privacy. Your data is..." className="!h-24" />
                    </FormField>
                    <FormField label="Terms of Service">
                      <Textarea value={storePolicies.terms} onChange={e => setStorePolicies({...storePolicies, terms: e.target.value})} placeholder="By using our store, you agree to..." className="!h-24" />
                    </FormField>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ── Trust Badges ── */}
          {activeTab === 'trust' && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Trust Badges</h3>
                <p className="text-xs text-gray-500 mb-4">Shown on your homepage to build customer confidence. Edit icon, title, and description.</p>
                <div className="space-y-4">
                  {trustBadges.map((badge, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0">
                        <Input value={badge.icon} onChange={e => { const nb = [...trustBadges]; nb[idx] = {...nb[idx], icon: e.target.value}; setTrustBadges(nb); }} className="!w-16 text-center text-xl !px-2" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input value={badge.title} onChange={e => { const nb = [...trustBadges]; nb[idx] = {...nb[idx], title: e.target.value}; setTrustBadges(nb); }} placeholder="Badge title" />
                        <Input value={badge.text} onChange={e => { const nb = [...trustBadges]; nb[idx] = {...nb[idx], text: e.target.value}; setTrustBadges(nb); }} placeholder="Badge description" />
                      </div>
                      <button onClick={() => setTrustBadges(trustBadges.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 self-start mt-2">✕</button>
                    </div>
                  ))}
                  {trustBadges.length < 6 && (
                    <button onClick={() => setTrustBadges([...trustBadges, { icon: '⭐', title: 'New Badge', text: 'Description' }])}
                      className="w-full p-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition">
                      + Add Trust Badge
                    </button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ── SEO ── */}
          {activeTab === 'seo' && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-1">SEO Defaults</h3>
                <p className="text-xs text-gray-500 mb-4">Default meta tags for search engines. Visible in Google results.</p>
                <div className="space-y-3">
                  <FormField label="Meta Title">
                    <Input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder={shop?.name || 'Your Store Name'} />
                    <p className="text-[11px] text-gray-400 mt-1">{seoTitle.length}/60 recommended</p>
                  </FormField>
                  <FormField label="Meta Description">
                    <Textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)} placeholder="A brief description of your store..." />
                    <p className="text-[11px] text-gray-400 mt-1">{seoDescription.length}/160 recommended</p>
                  </FormField>
                </div>
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Google Preview</p>
                  <p className="text-blue-600 text-base font-medium truncate">{seoTitle || shop?.name || 'Your Store Name'}</p>
                  <p className="text-xs text-green-700 font-mono truncate">{window.location.origin}{storeUrl || '/store/your-shop'}</p>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{seoDescription || 'Add a meta description for better SEO...'}</p>
                </div>
              </div>
            </Card>
          )}

          {/* ── Advanced ── */}
          {activeTab === 'advanced' && (
            <>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Header Config (JSON)</h3>
                  <p className="text-xs text-gray-500 mb-3">Logo, navigation links, etc.</p>
                  <Textarea value={headerConfig} onChange={e => setHeaderConfig(e.target.value)} className="font-mono text-xs !h-28" />
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Footer Config (JSON)</h3>
                  <p className="text-xs text-gray-500 mb-3">Footer text, links, copyright.</p>
                  <Textarea value={footerConfig} onChange={e => setFooterConfig(e.target.value)} className="font-mono text-xs !h-28" />
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Custom CSS</h3>
                  <p className="text-xs text-gray-500 mb-3">Injected after template styles.</p>
                  <Textarea value={customCss} onChange={e => setCustomCss(e.target.value)} className="font-mono text-xs !h-32" placeholder=".storefront .product-card { border: 2px solid gold; }" />
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Custom JavaScript</h3>
                  <p className="text-xs text-gray-500 mb-3">Runs on storefront pages (analytics, chatbots, etc.).</p>
                  <Textarea value={customJs} onChange={e => setCustomJs(e.target.value)} className="font-mono text-xs !h-28" placeholder="// Google Analytics, etc." />
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Info</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-gray-500">Template</p><p className="font-medium capitalize">{selectedTemplate.replace('_', ' ')}</p>
                    <p className="text-gray-500">Overrides</p><p className="font-medium">{overrideCount}</p>
                    <p className="text-gray-500">Last Updated</p><p>{settings?.updated_at ? new Date(settings.updated_at).toLocaleString() : '—'}</p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* ── Live Preview ── */}
        <div className="xl:col-span-2">
          <div className="sticky top-6">
            <Card>
              <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /><div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-gray-400 font-mono ml-2">{shop ? `${shop.slug}.ecomai.dev` : 'store preview'}</span>
                </div>
                {storeUrl && <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Open ↗</a>}
              </div>
              <div className="relative bg-gray-100" style={{ height: '600px' }}>
                {storeUrl ? (
                  <iframe ref={iframeRef} src={storeUrl} className="w-full h-full border-0" title="Store Preview" />
                ) : (
                  <div className="flex items-center justify-center h-full text-center p-6">
                    <div>
                      <div className="text-5xl mb-4">🎨</div>
                      <p className="text-sm font-medium text-gray-600">Live Preview</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-xs">Preview appears after you save with a shop slug configured.</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
            <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-medium text-gray-500 mb-2">Active Palette</p>
              <div className="flex gap-1.5 flex-wrap">
                {['primary', 'secondary', 'accent', 'bg', 'surface', 'text', 'headerBg', 'footerBg'].map(key => (
                  <div key={key} className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm" style={{ backgroundColor: resolved[key] }} title={`${key}: ${resolved[key]}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
