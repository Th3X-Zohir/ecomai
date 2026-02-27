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

  // Form fields
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [tokenOverrides, setTokenOverrides] = useState({});
  const [layoutConfig, setLayoutConfig] = useState('{}');
  const [navConfig, setNavConfig] = useState('{}');
  const [homepageConfig, setHomepageConfig] = useState('{}');
  const [customCss, setCustomCss] = useState('');
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCta, setHeroCta] = useState('');
  const [featuredTitle, setFeaturedTitle] = useState('');

  const iframeRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await websiteSettings.get();
        setSettings(data);
        setSelectedTemplate(data.theme_name || 'classic');
        setTokenOverrides(data.design_tokens || {});
        setLayoutConfig(JSON.stringify(data.layout_config || {}, null, 2));
        setNavConfig(JSON.stringify(data.navigation_config || {}, null, 2));
        setCustomCss(data.custom_css || '');

        const hp = data.homepage_config || {};
        setHomepageConfig(JSON.stringify(hp, null, 2));
        setHeroHeadline(hp?.hero?.headline || '');
        setHeroSubtitle(hp?.hero?.subtitle || '');
        setHeroCta(hp?.hero?.cta || '');
        setFeaturedTitle(hp?.featured_title || '');

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
      const hpObj = {
        hero: {
          headline: heroHeadline || undefined,
          subtitle: heroSubtitle || undefined,
          cta: heroCta || undefined,
        },
        featured_title: featuredTitle || undefined,
      };

      const patch = {
        theme_name: selectedTemplate,
        design_tokens: tokenOverrides,
        layout_config: JSON.parse(layoutConfig || '{}'),
        navigation_config: JSON.parse(navConfig || '{}'),
        homepage_config: hpObj,
        custom_css: customCss || null,
      };
      const updated = await websiteSettings.update(patch);
      setSettings(updated);
      setSuccess('Settings saved! Your storefront has been updated.');
      setTimeout(() => setSuccess(''), 4000);

      // Refresh preview iframe
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const updateToken = (key, value) => {
    setTokenOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const resetToken = (key) => {
    setTokenOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const currentDefaults = templates[selectedTemplate]?.defaults || templates.classic.defaults;
  const resolved = resolveTokens(selectedTemplate, tokenOverrides);

  const storeUrl = shop ? `/store/${shop.slug}` : null;

  const tabs = [
    { id: 'theme', label: 'Template', icon: '🎨' },
    { id: 'colors', label: 'Colors & Typography', icon: '🖌️' },
    { id: 'homepage', label: 'Homepage', icon: '🏠' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' },
  ];

  const COLOR_TOKENS = [
    { key: 'primary', label: 'Primary Color' },
    { key: 'secondary', label: 'Secondary Color' },
    { key: 'accent', label: 'Accent Color' },
    { key: 'bg', label: 'Background' },
    { key: 'surface', label: 'Surface' },
    { key: 'text', label: 'Text Color' },
    { key: 'textMuted', label: 'Muted Text' },
    { key: 'border', label: 'Border' },
    { key: 'headerBg', label: 'Header Background' },
    { key: 'headerText', label: 'Header Text' },
    { key: 'footerBg', label: 'Footer Background' },
    { key: 'footerText', label: 'Footer Text' },
  ];

  return (
    <div>
      <PageHeader title="Website Settings" description="Customize your public storefront design">
        <div className="flex items-center gap-2">
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Store
            </a>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Publish Changes'}
          </Button>
        </div>
      </PageHeader>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-success-50 text-success-600 text-sm rounded-lg">{success}</div>
      )}

      {/* Store URL */}
      {storeUrl && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-xl flex items-center gap-3">
          <span className="text-xl">🌐</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-800">Public Store URL</p>
            <p className="text-xs text-primary-600 font-mono truncate">
              {window.location.origin}{storeUrl}
            </p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.origin + storeUrl)}
            className="text-primary-600 hover:text-primary-700 text-xs font-medium px-3 py-1 bg-primary-100 rounded-lg"
          >
            Copy
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Settings panel */}
        <div className="xl:col-span-3 space-y-6">
          {/* Template Selection */}
          {activeTab === 'theme' && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold mb-4">Choose Template</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select a base template for your storefront. You can customize colors and layout in the other tabs.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {TEMPLATE_LIST.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => {
                        setSelectedTemplate(tmpl.id);
                        setTokenOverrides({}); // Reset overrides on template change
                      }}
                      className={`text-left p-4 rounded-xl border-2 transition ${
                        selectedTemplate === tmpl.id
                          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Color swatches */}
                      <div className="flex gap-1.5 mb-3">
                        {[tmpl.defaults.primary, tmpl.defaults.secondary, tmpl.defaults.accent, tmpl.defaults.bg, tmpl.defaults.surface].map((c, i) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-lg border border-gray-200"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <h4 className="font-semibold text-sm">{tmpl.name}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tmpl.description}</p>
                      {selectedTemplate === tmpl.id && (
                        <span className="inline-block mt-2 text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Colors & Typography */}
          {activeTab === 'colors' && (
            <>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold mb-1">Color Customization</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Override template defaults. Click "Reset" to revert to the template's default value.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {COLOR_TOKENS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <input
                          type="color"
                          value={resolved[key] || '#000000'}
                          onChange={(e) => updateToken(key, e.target.value)}
                          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-gray-400 font-mono">{resolved[key]}</p>
                        </div>
                        {tokenOverrides[key] && (
                          <button
                            onClick={() => resetToken(key)}
                            className="text-xs text-gray-400 hover:text-red-500"
                            title="Reset to template default"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-5">
                  <h3 className="font-semibold mb-3">Typography & Shapes</h3>
                  <div className="space-y-3">
                    <FormField label="Font Family">
                      <Input
                        value={tokenOverrides.fontFamily || currentDefaults.fontFamily}
                        onChange={(e) => updateToken('fontFamily', e.target.value)}
                        placeholder="'Inter', system-ui, sans-serif"
                      />
                    </FormField>
                    <FormField label="Border Radius">
                      <Input
                        value={tokenOverrides.radius || currentDefaults.radius}
                        onChange={(e) => updateToken('radius', e.target.value)}
                        placeholder="8px"
                      />
                    </FormField>
                    <FormField label="Button Radius">
                      <Input
                        value={tokenOverrides.buttonRadius || currentDefaults.buttonRadius}
                        onChange={(e) => updateToken('buttonRadius', e.target.value)}
                        placeholder="8px"
                      />
                    </FormField>
                    <FormField label="Hero Gradient">
                      <Input
                        value={tokenOverrides.heroGradient || currentDefaults.heroGradient}
                        onChange={(e) => updateToken('heroGradient', e.target.value)}
                        placeholder="linear-gradient(135deg, #2563eb 0%, #1e40af 100%)"
                      />
                    </FormField>
                    <FormField label="Card Shadow">
                      <Input
                        value={tokenOverrides.cardShadow || currentDefaults.cardShadow}
                        onChange={(e) => updateToken('cardShadow', e.target.value)}
                        placeholder="0 1px 3px rgba(0,0,0,0.1)"
                      />
                    </FormField>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Homepage Content */}
          {activeTab === 'homepage' && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold mb-1">Homepage Content</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Customize the hero section and featured products area. Leave blank for default text.
                </p>
                <div className="space-y-3">
                  <FormField label="Hero Headline">
                    <Input
                      value={heroHeadline}
                      onChange={(e) => setHeroHeadline(e.target.value)}
                      placeholder={`Welcome to ${shop?.name || 'Your Store'}`}
                    />
                  </FormField>
                  <FormField label="Hero Subtitle">
                    <Input
                      value={heroSubtitle}
                      onChange={(e) => setHeroSubtitle(e.target.value)}
                      placeholder="Discover our curated collection of premium products."
                    />
                  </FormField>
                  <FormField label="Hero Call-to-Action Text">
                    <Input
                      value={heroCta}
                      onChange={(e) => setHeroCta(e.target.value)}
                      placeholder="Shop Now"
                    />
                  </FormField>
                  <FormField label="Featured Products Section Title">
                    <Input
                      value={featuredTitle}
                      onChange={(e) => setFeaturedTitle(e.target.value)}
                      placeholder="Featured Products"
                    />
                  </FormField>
                </div>
              </div>
            </Card>
          )}

          {/* Advanced */}
          {activeTab === 'advanced' && (
            <>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold mb-1">Navigation Config (JSON)</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Customize navigation links. Example: {`{"links": [{"label": "Home", "to": "/store/slug"}, ...]}`}
                  </p>
                  <Textarea
                    value={navConfig}
                    onChange={(e) => setNavConfig(e.target.value)}
                    className="font-mono text-xs h-28!"
                  />
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold mb-1">Layout Config (JSON)</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Override section ordering and layout on the homepage.
                  </p>
                  <Textarea
                    value={layoutConfig}
                    onChange={(e) => setLayoutConfig(e.target.value)}
                    className="font-mono text-xs h-28!"
                  />
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold mb-1">Custom CSS</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Add custom CSS to your storefront. This will be injected after the template styles.
                  </p>
                  <Textarea
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    className="font-mono text-xs h-32!"
                    placeholder={`.storefront .product-card { border: 2px solid gold; }`}
                  />
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold mb-3">Version Info</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-gray-500">Published Version</p>
                    <p className="font-medium">{settings?.published_version || 1}</p>
                    <p className="text-gray-500">Draft Version</p>
                    <p className="font-medium">{settings?.draft_version || 1}</p>
                    <p className="text-gray-500">Last Updated</p>
                    <p>{settings?.updated_at ? new Date(settings.updated_at).toLocaleString() : '—'}</p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Live preview */}
        <div className="xl:col-span-2">
          <div className="sticky top-6">
            <Card>
              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-gray-400 font-mono ml-2">
                    {shop ? `${shop.slug}.ecomai.dev` : 'store preview'}
                  </span>
                </div>
                {storeUrl && (
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Open ↗
                  </a>
                )}
              </div>
              <div className="relative bg-gray-100" style={{ height: '600px' }}>
                {storeUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={storeUrl}
                    className="w-full h-full border-0"
                    title="Store Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-center p-6">
                    <div>
                      <div className="text-4xl mb-3">🎨</div>
                      <p className="text-sm text-gray-500">
                        Preview will appear here once you select a template and save.
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Super admin: Use a shop-scoped account to see preview.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
