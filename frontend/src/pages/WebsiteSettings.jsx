import { useState, useEffect, useRef } from 'react';
import { websiteSettings, shops, products as productsApi, dashboard as dashboardApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { templates, resolveTokens, fontPairings, colorPresets, getContrastRatio, getContrastLevel } from '../storefront/templates';
import { PageHeader, Card, Button, FormField, Input, Textarea } from '../components/UI';

const TEMPLATE_LIST = Object.values(templates);

/* ── Reusable Image Uploader ── */
function ImageUploader({ label, value, onChange, hint }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await websiteSettings.uploadImage(file);
      onChange(result.url);
    } catch { }
    setUploading(false);
  };
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
          {value ? <img src={value} alt="" className="w-full h-full object-contain" /> : <span className="text-2xl text-gray-300">📷</span>}
        </div>
        <div className="flex-1">
          <input ref={ref} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <Button variant="secondary" size="sm" onClick={() => ref.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading...' : value ? 'Change' : 'Upload'}
          </Button>
          {value && <button onClick={() => onChange('')} className="ml-2 text-xs text-red-500 hover:text-red-700">Remove</button>}
          {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Toggle Switch ── */
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

/* ── Nav Item Editor ── */
function NavItemEditor({ items, onChange }) {
  const add = () => onChange([...items, { label: '', url: '' }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => { const n = [...items]; n[i] = { ...n[i], [field]: val }; onChange(n); };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input value={item.label} onChange={e => update(i, 'label', e.target.value)} placeholder="Label" className="!flex-1" />
          <Input value={item.url || item.to || ''} onChange={e => update(i, 'url', e.target.value)} placeholder="/products or https://..." className="!flex-1" />
          <button onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 text-lg px-1">✕</button>
        </div>
      ))}
      {items.length < 8 && (
        <button onClick={add} className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Add Link</button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function WebsiteSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [shop, setShop] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('branding');

  /* ── Form state aligned with backend DB columns ── */
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [tokenOverrides, setTokenOverrides] = useState({});
  const [customCss, setCustomCss] = useState('');
  const [customJs, setCustomJs] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  /* ── Branding ── */
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [logoHeight, setLogoHeight] = useState('40');
  const [showShopName, setShowShopName] = useState(true);
  const [headerLayout, setHeaderLayout] = useState('left'); // left, center

  /* ── Homepage ── */
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCta, setHeroCta] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroOverlayOpacity, setHeroOverlayOpacity] = useState(50);
  const [heroOverlayColor, setHeroOverlayColor] = useState('#000000');
  const [featuredTitle, setFeaturedTitle] = useState('');
  const [featuredSubtitle, setFeaturedSubtitle] = useState('');
  const [featuredProductIds, setFeaturedProductIds] = useState([]);
  const [ctaHeadline, setCtaHeadline] = useState('');
  const [ctaSubtitle, setCtaSubtitle] = useState('');

  /* ── A/B Testing ── */
  const [abTest, setAbTest] = useState({ enabled: false, variants: [{ headline: '', subtitle: '', cta: '' }, { headline: '', subtitle: '', cta: '' }] });

  /* ── Navigation ── */
  const [navItems, setNavItems] = useState([]);

  /* ── Footer ── */
  const [footerTagline, setFooterTagline] = useState('');
  const [footerCopyright, setFooterCopyright] = useState('');
  const [footerLinks, setFooterLinks] = useState([]);
  const [showPaymentIcons, setShowPaymentIcons] = useState(true);

  /* ── Announcement ── */
  const [announcement, setAnnouncement] = useState({ enabled: false, text: '', link: '', bg_color: '#4f46e5', text_color: '#ffffff' });

  /* ── Social & Business ── */
  const [socialLinks, setSocialLinks] = useState({ facebook: '', instagram: '', twitter: '', tiktok: '', youtube: '', whatsapp: '' });
  const [businessInfo, setBusinessInfo] = useState({ phone: '', email: '', address: '', whatsapp: '', hours: '' });

  /* ── Store Settings ── */
  const [currencySymbol, setCurrencySymbol] = useState('৳');
  const [currencyCode, setCurrencyCode] = useState('BDT');
  const [currencyPosition, setCurrencyPosition] = useState('before');
  const [currencyDecimals, setCurrencyDecimals] = useState(2);
  const [secondaryCurrency, setSecondaryCurrency] = useState({ enabled: false, code: 'USD', symbol: '$', rate: 0, position: 'before' });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [productsPerPage, setProductsPerPage] = useState(12);
  const [gridColumns, setGridColumns] = useState(4);
  const [defaultSort, setDefaultSort] = useState('newest');
  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [guestCheckout, setGuestCheckout] = useState(true);
  const [cookieConsent, setCookieConsent] = useState(false);
  const [shippingDisplay, setShippingDisplay] = useState('free');
  const [flatShippingRate, setFlatShippingRate] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('');
  const [shippingCustomText, setShippingCustomText] = useState('');
  const [storeLayout, setStoreLayout] = useState('default');

  /* ── Policies ── */
  const [storePolicies, setStorePolicies] = useState({ return_policy: '', privacy_policy: '', terms: '', about_us: '' });

  /* ── Trust Badges ── */
  const [trustBadges, setTrustBadges] = useState([
    { icon: '🔒', title: 'Secure Checkout', text: '100% secure payment' },
    { icon: '🚀', title: 'Fast Shipping', text: 'Free delivery on orders over $50' },
    { icon: '💬', title: '24/7 Support', text: 'Dedicated customer support' },
  ]);

  /* ── Analytics ── */
  const [ga4Id, setGa4Id] = useState('');
  const [fbPixelId, setFbPixelId] = useState('');
  const [gtmId, setGtmId] = useState('');
  const [dashData, setDashData] = useState(null);
  const [dashTimeline, setDashTimeline] = useState([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashDays, setDashDays] = useState(30);

  /* ── Popup Config ── */
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupHeadline, setPopupHeadline] = useState('');
  const [popupBody, setPopupBody] = useState('');
  const [popupCtaText, setPopupCtaText] = useState('');
  const [popupCtaLink, setPopupCtaLink] = useState('');
  const [popupDiscountCode, setPopupDiscountCode] = useState('');
  const [popupDelay, setPopupDelay] = useState(5);
  const [popupShowOnce, setPopupShowOnce] = useState(true);

  /* ── Countdown ── */
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [countdownEndDate, setCountdownEndDate] = useState('');
  const [countdownHeadline, setCountdownHeadline] = useState('');
  const [countdownBg, setCountdownBg] = useState('#ef4444');
  const [countdownTextColor, setCountdownTextColor] = useState('#ffffff');

  const iframeRef = useRef(null);

  /* ═══════ LOAD DATA ═══════ */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [data, prods] = await Promise.all([
          websiteSettings.get(),
          productsApi.list().catch(() => ({ items: [] })),
        ]);
        setSettings(data);
        setAllProducts(prods.items || []);

        // Template & tokens
        setSelectedTemplate(data.template || 'classic');
        setTokenOverrides(data.theme || {});
        setCustomCss(data.custom_css || '');
        setCustomJs(data.custom_js || '');

        // SEO
        const seo = data.seo_defaults || {};
        setSeoTitle(seo.title || '');
        setSeoDescription(seo.description || '');
        setOgImageUrl(seo.og_image_url || '');
        setFaviconUrl(seo.favicon_url || '');

        // Branding from header
        const hdr = data.header || {};
        setLogoUrl(hdr.logo_url || '');
        setLogoHeight(hdr.logo_height || '40');
        setShowShopName(hdr.show_name !== false);
        setHeaderLayout(hdr.layout || 'left');
        setNavItems(hdr.nav || []);

        // Footer
        const ftr = data.footer || {};
        setFooterTagline(ftr.tagline || '');
        setFooterCopyright(ftr.copyright || '');
        setFooterLinks(ftr.links || []);
        setShowPaymentIcons(ftr.show_payment_icons !== false);

        // Homepage
        const hp = data.homepage || {};
        setHeroHeadline(hp?.hero?.headline || hp?.hero?.title || '');
        setHeroSubtitle(hp?.hero?.subtitle || '');
        setHeroCta(hp?.hero?.cta || '');
        setHeroImageUrl(hp?.hero?.image_url || '');
        setHeroOverlayOpacity(hp?.hero?.overlay_opacity ?? 50);
        setHeroOverlayColor(hp?.hero?.overlay_color || '#000000');
        setFeaturedTitle(hp?.featured_title || '');
        setFeaturedSubtitle(hp?.featured_subtitle || '');
        setFeaturedProductIds(hp?.featured_product_ids || []);
        setCtaHeadline(hp?.cta?.headline || '');
        setCtaSubtitle(hp?.cta?.subtitle || '');
        if (hp?.ab_test) setAbTest(hp.ab_test);

        // Announcement
        const ann = data.announcement || {};
        setAnnouncement({ enabled: !!ann.enabled, text: ann.text || '', link: ann.link || '', bg_color: ann.bg_color || '#4f46e5', text_color: ann.text_color || '#ffffff' });

        // Social & Business
        const sl = data.social_links || {};
        setSocialLinks({ facebook: sl.facebook || '', instagram: sl.instagram || '', twitter: sl.twitter || '', tiktok: sl.tiktok || '', youtube: sl.youtube || '', whatsapp: sl.whatsapp || '' });
        const bi = data.business_info || {};
        setBusinessInfo({ phone: bi.phone || '', email: bi.email || '', address: bi.address || '', whatsapp: bi.whatsapp || '', hours: bi.hours || '' });

        // Policies
        const sp = data.store_policies || {};
        setStorePolicies({ return_policy: sp.return_policy || '', privacy_policy: sp.privacy_policy || '', terms: sp.terms || '', about_us: sp.about_us || '' });

        // Trust badges
        if (data.trust_badges?.length > 0) setTrustBadges(data.trust_badges);

        // Currency
        const cc = data.currency_config || {};
        setCurrencySymbol(cc.symbol || '৳');
        setCurrencyCode(cc.code || 'BDT');
        setCurrencyPosition(cc.position || 'before');
        setCurrencyDecimals(cc.decimals ?? 2);
        if (cc.secondary) setSecondaryCurrency(cc.secondary);

        // Store config
        const sc = data.store_config || {};
        setMaintenanceMode(!!sc.maintenance_mode);
        setMaintenanceMessage(sc.maintenance_message || '');
        setProductsPerPage(sc.products_per_page || 12);
        setGridColumns(sc.grid_columns || 4);
        setDefaultSort(sc.default_sort || 'newest');
        setShowOutOfStock(sc.show_out_of_stock !== false);
        setMinOrderAmount(sc.min_order_amount || '');
        setGuestCheckout(sc.guest_checkout !== false);
        setCookieConsent(!!sc.cookie_consent);
        setShippingDisplay(sc.shipping_display || 'free');
        setFlatShippingRate(sc.flat_shipping_rate || '');
        setFreeShippingThreshold(sc.free_shipping_threshold || '');
        setShippingCustomText(sc.shipping_custom_text || '');
        setStoreLayout(sc.store_layout || 'default');

        // Analytics
        const an = data.analytics || {};
        setGa4Id(an.ga4_id || '');
        setFbPixelId(an.fb_pixel_id || '');
        setGtmId(an.gtm_id || '');

        // Popup
        const pop = data.popup_config || {};
        setPopupEnabled(!!pop.enabled);
        setPopupHeadline(pop.headline || '');
        setPopupBody(pop.body || '');
        setPopupCtaText(pop.cta_text || '');
        setPopupCtaLink(pop.cta_link || '');
        setPopupDiscountCode(pop.discount_code || '');
        setPopupDelay(pop.delay_seconds || 5);
        setPopupShowOnce(pop.show_once !== false);

        // Countdown
        const cd = data.countdown || {};
        setCountdownEnabled(!!cd.enabled);
        setCountdownEndDate(cd.end_date || '');
        setCountdownHeadline(cd.headline || '');
        setCountdownBg(cd.bg_color || '#ef4444');
        setCountdownTextColor(cd.text_color || '#ffffff');

        if (user.role !== 'super_admin') {
          const s = await shops.me();
          setShop(s);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [user]);

  /* ═══════ SAVE ═══════ */
  const handleSave = async () => {
    setError(''); setSaving(true); setSuccess('');
    try {
      const patch = {
        template: selectedTemplate,
        theme: tokenOverrides,
        header: {
          logo_url: logoUrl || undefined,
          logo_height: logoHeight || '40',
          show_name: showShopName,
          layout: headerLayout,
          nav: navItems,
        },
        footer: {
          tagline: footerTagline || undefined,
          copyright: footerCopyright || undefined,
          links: footerLinks,
          show_payment_icons: showPaymentIcons,
        },
        homepage: {
          hero: {
            headline: heroHeadline || undefined,
            subtitle: heroSubtitle || undefined,
            cta: heroCta || undefined,
            image_url: heroImageUrl || undefined,
            overlay_opacity: heroOverlayOpacity,
            overlay_color: heroOverlayColor,
          },
          featured_title: featuredTitle || undefined,
          featured_subtitle: featuredSubtitle || undefined,
          featured_product_ids: featuredProductIds.length > 0 ? featuredProductIds : undefined,
          cta: {
            headline: ctaHeadline || undefined,
            subtitle: ctaSubtitle || undefined,
          },
          ab_test: abTest.enabled ? abTest : undefined,
        },
        custom_css: customCss || null,
        custom_js: customJs || null,
        seo_defaults: { title: seoTitle || undefined, description: seoDescription || undefined, og_image_url: ogImageUrl || undefined, favicon_url: faviconUrl || undefined },
        social_links: socialLinks,
        business_info: businessInfo,
        announcement,
        store_policies: storePolicies,
        trust_badges: trustBadges,
        currency_config: { symbol: currencySymbol, code: currencyCode, position: currencyPosition, decimals: Number(currencyDecimals), secondary: secondaryCurrency.enabled ? secondaryCurrency : undefined },
        store_config: {
          maintenance_mode: maintenanceMode,
          maintenance_message: maintenanceMessage || undefined,
          products_per_page: Number(productsPerPage),
          grid_columns: Number(gridColumns),
          default_sort: defaultSort,
          show_out_of_stock: showOutOfStock,
          min_order_amount: minOrderAmount ? Number(minOrderAmount) : undefined,
          guest_checkout: guestCheckout,
          cookie_consent: cookieConsent,
          shipping_display: shippingDisplay,
          flat_shipping_rate: flatShippingRate ? Number(flatShippingRate) : undefined,
          free_shipping_threshold: freeShippingThreshold ? Number(freeShippingThreshold) : undefined,
          shipping_custom_text: shippingCustomText || undefined,
          store_layout: storeLayout,
        },
        analytics: { ga4_id: ga4Id || undefined, fb_pixel_id: fbPixelId || undefined, gtm_id: gtmId || undefined },
        popup_config: {
          enabled: popupEnabled,
          headline: popupHeadline || undefined,
          body: popupBody || undefined,
          cta_text: popupCtaText || undefined,
          cta_link: popupCtaLink || undefined,
          discount_code: popupDiscountCode || undefined,
          delay_seconds: Number(popupDelay),
          show_once: popupShowOnce,
        },
        countdown: {
          enabled: countdownEnabled,
          end_date: countdownEndDate || undefined,
          headline: countdownHeadline || undefined,
          bg_color: countdownBg,
          text_color: countdownTextColor,
        },
      };
      const updated = await websiteSettings.update(patch);
      setSettings(updated);
      setSuccess('Published! Your storefront is now updated.');
      setTimeout(() => setSuccess(''), 5000);
      if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const updateToken = (key, value) => setTokenOverrides(prev => ({ ...prev, [key]: value }));
  const resetToken = (key) => setTokenOverrides(prev => { const n = { ...prev }; delete n[key]; return n; });

  const currentDefaults = templates[selectedTemplate]?.defaults || templates.classic.defaults;
  const resolved = resolveTokens(selectedTemplate, tokenOverrides);

  /* ── Live Preview via postMessage ── */
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage({ type: 'ecomai_preview', tokens: resolved, template: selectedTemplate }, '*');
    } catch {}
  }, [resolved, selectedTemplate]);

  /* ── Load Dashboard Data when Analytics tab is active ── */
  useEffect(() => {
    if (activeTab !== 'analytics') return;
    setDashLoading(true);
    Promise.all([
      dashboardApi.shop().catch(() => null),
      dashboardApi.revenueTimeline(dashDays).catch(() => []),
    ]).then(([shopData, timeline]) => {
      if (shopData) setDashData(shopData);
      setDashTimeline(Array.isArray(timeline) ? timeline : []);
    }).finally(() => setDashLoading(false));
  }, [activeTab, dashDays]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-4 w-64 bg-gray-100 rounded" />
        <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
          <div className="xl:col-span-1"><div className="bg-white rounded-xl border border-gray-200 p-2 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-9 bg-gray-100 rounded-lg" />)}</div></div>
          <div className="xl:col-span-3 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 h-40" />)}
          </div>
          <div className="xl:col-span-2"><div className="bg-white rounded-xl border border-gray-200 h-96" /></div>
        </div>
      </div>
    );
  }
  const storeUrl = shop ? `/store/${shop.slug}` : null;
  const overrideCount = Object.keys(tokenOverrides).length;

  const tabs = [
    { id: 'branding', label: 'Branding', icon: '🎯' },
    { id: 'theme', label: 'Template', icon: '🎨' },
    { id: 'colors', label: 'Colors & Fonts', icon: '🖌️' },
    { id: 'homepage', label: 'Homepage', icon: '🏠' },
    { id: 'navigation', label: 'Navigation', icon: '🧭' },
    { id: 'footer', label: 'Footer', icon: '📐' },
    { id: 'announcement', label: 'Banners', icon: '📢' },
    { id: 'social', label: 'Social & Contact', icon: '🌐' },
    { id: 'store', label: 'Store Config', icon: '⚙️' },
    { id: 'policies', label: 'Policies', icon: '📜' },
    { id: 'trust', label: 'Trust Badges', icon: '🛡️' },
    { id: 'seo', label: 'SEO', icon: '🔍' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'popups', label: 'Popups & Timer', icon: '🎯' },
    { id: 'advanced', label: 'Advanced', icon: '🔧' },
  ];

  const COLOR_TOKENS = [
    { key: 'primary', label: 'Primary' }, { key: 'secondary', label: 'Secondary' },
    { key: 'accent', label: 'Accent' }, { key: 'bg', label: 'Background' },
    { key: 'surface', label: 'Surface' }, { key: 'text', label: 'Text' },
    { key: 'textMuted', label: 'Muted Text' }, { key: 'border', label: 'Border' },
    { key: 'headerBg', label: 'Header Bg' }, { key: 'headerText', label: 'Header Text' },
    { key: 'footerBg', label: 'Footer Bg' }, { key: 'footerText', label: 'Footer Text' },
  ];

  const CURRENCIES = [
    { symbol: '৳', code: 'BDT', name: 'Bangladeshi Taka' },
    { symbol: '$', code: 'USD', name: 'US Dollar' },
    { symbol: '€', code: 'EUR', name: 'Euro' },
    { symbol: '£', code: 'GBP', name: 'British Pound' },
    { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
    { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
    { symbol: 'RM', code: 'MYR', name: 'Malaysian Ringgit' },
    { symbol: '₺', code: 'TRY', name: 'Turkish Lira' },
    { symbol: 'R$', code: 'BRL', name: 'Brazilian Real' },
    { symbol: '₱', code: 'PHP', name: 'Philippine Peso' },
    { symbol: 'kr', code: 'SEK', name: 'Swedish Krona' },
    { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
    { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar' },
  ];

  return (
    <div>
      <PageHeader title="Website Settings" description="Customize your storefront appearance, branding, and features">
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

      {maintenanceMode && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded-xl flex items-center gap-3">
          <span className="text-lg">🚧</span><div className="flex-1 font-medium">Maintenance Mode is ON — your store is not visible to customers.</div>
        </div>
      )}

      {storeUrl && (
        <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl flex items-center gap-3">
          <span className="text-xl">🌐</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-800">Public Storefront</p>
            <p className="text-xs text-primary-600 font-mono truncate">{window.location.origin}{storeUrl}</p>
          </div>
          <button onClick={() => navigator.clipboard.writeText(window.location.origin + storeUrl)}
            className="text-primary-600 hover:text-primary-700 text-xs font-medium px-3 py-1.5 bg-white border border-primary-200 rounded-lg transition hover:shadow-sm">Copy URL</button>
        </div>
      )}

      {/* Tabs - Sidebar + Content layout */}
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
        {/* Tab sidebar */}
        <div className="xl:col-span-1">
          <div className="xl:sticky xl:top-4">
            {/* Mobile: horizontal scroll */}
            <div className="flex xl:hidden gap-1 mb-4 overflow-x-auto scrollbar-hide pb-2 border-b border-gray-200">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-primary-50 text-primary-600 ring-1 ring-primary-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}>
                  <span>{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>
            {/* Desktop: vertical sidebar */}
            <nav className="hidden xl:flex flex-col gap-0.5 bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-all text-left ${
                    activeTab === tab.id ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}>
                  <span className="text-base">{tab.icon}</span>
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

      <div className="xl:col-span-3 space-y-6">

          {/* ════════════ BRANDING ════════════ */}
          {activeTab === 'branding' && (
            <>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Store Logo</h3>
                  <p className="text-xs text-gray-500 mb-4">Appears in the header and browser tab. Recommended: 200×60px or larger.</p>
                  <ImageUploader label="Logo Image" value={logoUrl} onChange={setLogoUrl} hint="PNG, SVG, or WebP with transparent background works best." />
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <FormField label="Logo Height (px)">
                      <Input type="number" min="20" max="100" value={logoHeight} onChange={e => setLogoHeight(e.target.value)} />
                    </FormField>
                    <FormField label="Header Layout">
                      <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" value={headerLayout} onChange={e => setHeaderLayout(e.target.value)}>
                        <option value="left">Logo Left</option>
                        <option value="center">Logo Centered</option>
                      </select>
                    </FormField>
                  </div>
                  <div className="mt-3">
                    <Toggle checked={showShopName} onChange={setShowShopName} label="Show store name next to logo" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Favicon & Social Image</h3>
                  <p className="text-xs text-gray-500 mb-4">Browser tab icon and the image shown when shared on social media.</p>
                  <div className="grid grid-cols-2 gap-6">
                    <ImageUploader label="Favicon" value={faviconUrl} onChange={setFaviconUrl} hint="32×32px .ico, .png, or .svg" />
                    <ImageUploader label="Social Share Image (OG)" value={ogImageUrl} onChange={setOgImageUrl} hint="1200×630px for best display" />
                  </div>
                </div>
              </Card>
              {/* Brand preview */}
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
                  <div className="p-4 rounded-lg border border-gray-200" style={{ backgroundColor: resolved.headerBg }}>
                    <div className="flex items-center gap-3">
                      {logoUrl && <img src={logoUrl} alt="logo" style={{ height: `${logoHeight}px` }} className="object-contain" />}
                      {showShopName && <span className="font-bold text-lg" style={{ color: resolved.primary }}>{shop?.name || 'Your Store'}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ════════════ TEMPLATE ════════════ */}
          {activeTab === 'theme' && (
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Choose a Template</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Pick a style. Customize further in Colors & Fonts.</p>
                  </div>
                  {overrideCount > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">{overrideCount} override{overrideCount > 1 ? 's' : ''}</span>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {TEMPLATE_LIST.map(tmpl => (
                    <button key={tmpl.id} onClick={() => { setSelectedTemplate(tmpl.id); setTokenOverrides({}); }}
                      className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${selectedTemplate === tmpl.id ? 'border-primary-500 bg-primary-50/60 shadow-sm ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                      {/* Mini layout preview */}
                      <div className="mb-3 rounded-lg overflow-hidden border border-gray-200" style={{ height: '80px', backgroundColor: tmpl.defaults.bg }}>
                        {/* Header bar */}
                        <div className="flex items-center px-2 py-1" style={{ backgroundColor: tmpl.defaults.headerBg, borderBottom: `1px solid ${tmpl.defaults.border}` }}>
                          <div className="w-8 h-2 rounded" style={{ backgroundColor: tmpl.defaults.primary }} />
                          <div className="ml-auto flex gap-1">
                            <div className="w-4 h-1.5 rounded" style={{ backgroundColor: tmpl.defaults.headerText, opacity: 0.3 }} />
                            <div className="w-4 h-1.5 rounded" style={{ backgroundColor: tmpl.defaults.headerText, opacity: 0.3 }} />
                          </div>
                        </div>
                        {/* Hero */}
                        <div className="mx-1.5 mt-1 px-2 py-1.5 rounded" style={{ background: tmpl.defaults.heroGradient }}>
                          <div className="w-12 h-1.5 rounded bg-white opacity-80 mb-1" />
                          <div className="w-8 h-1 rounded bg-white opacity-50" />
                        </div>
                        {/* Products grid */}
                        <div className="flex gap-1 mx-1.5 mt-1">
                          {[0,1,2,3].map(i => (
                            <div key={i} className="flex-1 rounded" style={{ height: '14px', backgroundColor: tmpl.defaults.surface, border: `1px solid ${tmpl.defaults.border}` }} />
                          ))}
                        </div>
                        {/* Footer */}
                        <div className="mt-1 px-1.5 py-0.5" style={{ backgroundColor: tmpl.defaults.footerBg }}>
                          <div className="w-6 h-1 rounded" style={{ backgroundColor: tmpl.defaults.footerText, opacity: 0.3 }} />
                        </div>
                      </div>
                      <div className="flex gap-1.5 mb-2">
                        {[tmpl.defaults.primary, tmpl.defaults.secondary, tmpl.defaults.accent, tmpl.defaults.bg, tmpl.defaults.surface].map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded-md border border-gray-200 shadow-sm" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <h4 className="font-semibold text-sm text-gray-900">{tmpl.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tmpl.description}</p>
                      {selectedTemplate === tmpl.id && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">✓ Active</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ════════════ COLORS & FONTS ════════════ */}
          {activeTab === 'colors' && (
            <>
              {/* Color Presets */}
              {colorPresets[selectedTemplate] && (
                <Card>
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 mb-1">Quick Color Schemes</h3>
                    <p className="text-xs text-gray-500 mb-3">One-click preset palettes for {templates[selectedTemplate]?.name || selectedTemplate}.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {colorPresets[selectedTemplate].map((preset, i) => {
                        const isActive = ['primary','secondary','accent','bg','surface','text'].every(k => resolved[k] === preset[k]);
                        return (
                          <button key={i} onClick={() => setTokenOverrides(prev => ({ ...prev, primary: preset.primary, secondary: preset.secondary, accent: preset.accent, bg: preset.bg, surface: preset.surface, text: preset.text }))}
                            className={`text-left p-3 rounded-lg border-2 transition-all hover:shadow-sm ${isActive ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300'}`}>
                            <div className="flex gap-1 mb-2">
                              {[preset.primary, preset.secondary, preset.accent, preset.bg, preset.surface].map((c, j) => (
                                <div key={j} className="w-5 h-5 rounded-md border border-gray-200" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                            <p className="text-xs font-medium text-gray-700">{preset.name}</p>
                            {isActive && <span className="text-[10px] text-primary-600 font-medium">Active</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              )}
              <Card>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Color Palette</h3>
                      <p className="text-xs text-gray-500">Override any template color. Click Reset to revert.</p>
                    </div>
                    {overrideCount > 0 && <button onClick={() => setTokenOverrides({})} className="text-xs text-gray-500 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50">Reset All</button>}
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
                        {tokenOverrides[key] && <button onClick={() => resetToken(key)} className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 hover:text-red-500 transition-all" title="Reset">↺</button>}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              {/* Font Pairing Selector */}
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Font Pairing</h3>
                  <p className="text-xs text-gray-500 mb-3">Choose a pre-built font combination or customize below.</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {fontPairings.map(fp => {
                      const isActive = resolved.fontFamily === fp.body && resolved.headingFont === fp.heading;
                      return (
                        <button key={fp.id} onClick={() => setTokenOverrides(prev => ({ ...prev, fontFamily: fp.body, headingFont: fp.heading }))}
                          className={`text-left p-3 rounded-lg border-2 transition-all hover:shadow-sm ${isActive ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300'}`}>
                          <p className="text-sm font-semibold text-gray-800" style={{ fontFamily: fp.heading }}>{fp.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate" style={{ fontFamily: fp.body }}>Body: {fp.body.split(',')[0].replace(/'/g, '')}</p>
                          {isActive && <span className="text-[10px] text-primary-600 font-medium mt-1 inline-block">Active</span>}
                        </button>
                      );
                    })}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 mt-4">Typography & Shapes</h3>
                  <p className="text-xs text-gray-500 mb-4">Leave blank to use template defaults.</p>
                  <div className="space-y-3">
                    <FormField label="Body Font"><Input value={tokenOverrides.fontFamily || ''} onChange={e => updateToken('fontFamily', e.target.value)} placeholder={currentDefaults.fontFamily} /></FormField>
                    <FormField label="Heading Font"><Input value={tokenOverrides.headingFont || ''} onChange={e => updateToken('headingFont', e.target.value)} placeholder={currentDefaults.headingFont} /></FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Border Radius"><Input value={tokenOverrides.radius || ''} onChange={e => updateToken('radius', e.target.value)} placeholder={currentDefaults.radius} /></FormField>
                      <FormField label="Button Radius"><Input value={tokenOverrides.buttonRadius || ''} onChange={e => updateToken('buttonRadius', e.target.value)} placeholder={currentDefaults.buttonRadius} /></FormField>
                    </div>
                    <FormField label="Hero Gradient"><Input value={tokenOverrides.heroGradient || ''} onChange={e => updateToken('heroGradient', e.target.value)} placeholder={currentDefaults.heroGradient} /></FormField>
                    <FormField label="Card Shadow"><Input value={tokenOverrides.cardShadow || ''} onChange={e => updateToken('cardShadow', e.target.value)} placeholder={currentDefaults.cardShadow} /></FormField>
                  </div>
                </div>
              </Card>
              {/* Contrast Checker */}
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Accessibility Check</h3>
                  <p className="text-xs text-gray-500 mb-3">WCAG 2.1 contrast ratios for your current color scheme.</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Text on Background', fg: resolved.text, bg: resolved.bg },
                      { label: 'Muted on Background', fg: resolved.textMuted, bg: resolved.bg },
                      { label: 'Primary on Background', fg: resolved.primary, bg: resolved.bg },
                      { label: 'Text on Surface', fg: resolved.text, bg: resolved.surface },
                      { label: 'Header Text on Header', fg: resolved.headerText, bg: resolved.headerBg },
                      { label: 'Footer Text on Footer', fg: resolved.footerText, bg: resolved.footerBg },
                    ].map((check, i) => {
                      const ratio = getContrastRatio(check.fg, check.bg);
                      const level = getContrastLevel(ratio);
                      return (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <div className="flex gap-1">
                            <div className="w-5 h-5 rounded border border-gray-200" style={{ backgroundColor: check.fg }} title={check.fg} />
                            <div className="w-5 h-5 rounded border border-gray-200" style={{ backgroundColor: check.bg }} title={check.bg} />
                          </div>
                          <span className="text-xs text-gray-600 flex-1">{check.label}</span>
                          <span className="text-xs font-mono text-gray-400">{ratio.toFixed(1)}:1</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: level.color + '15', color: level.color }}>{level.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ════════════ HOMEPAGE ════════════ */}
          {activeTab === 'homepage' && (
            <>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Hero Section</h3>
                  <p className="text-xs text-gray-500 mb-4">The main banner at the top of your homepage.</p>
                  <ImageUploader label="Hero Background Image" value={heroImageUrl} onChange={setHeroImageUrl} hint="1920×800px recommended. Falls back to gradient if empty." />
                  {heroImageUrl && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <FormField label="Overlay Color">
                        <div className="flex items-center gap-2">
                          <input type="color" value={heroOverlayColor} onChange={e => setHeroOverlayColor(e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer" />
                          <Input value={heroOverlayColor} onChange={e => setHeroOverlayColor(e.target.value)} />
                        </div>
                      </FormField>
                      <FormField label={`Overlay Opacity: ${heroOverlayOpacity}%`}>
                        <input type="range" min="0" max="100" value={heroOverlayOpacity} onChange={e => setHeroOverlayOpacity(Number(e.target.value))} className="w-full mt-2" />
                      </FormField>
                    </div>
                  )}
                  <div className="space-y-3 mt-4">
                    <FormField label="Hero Headline"><Input value={heroHeadline} onChange={e => setHeroHeadline(e.target.value)} placeholder={`Welcome to ${shop?.name || 'Your Store'}`} /></FormField>
                    <FormField label="Hero Subtitle"><Input value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} placeholder="Discover our curated collection of premium products." /></FormField>
                    <FormField label="CTA Button Text"><Input value={heroCta} onChange={e => setHeroCta(e.target.value)} placeholder="Shop Now" /></FormField>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Featured Products Section</h3>
                  <p className="text-xs text-gray-500 mb-4">Customize the featured products display.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Section Title"><Input value={featuredTitle} onChange={e => setFeaturedTitle(e.target.value)} placeholder="Featured Products" /></FormField>
                    <FormField label="Section Subtitle"><Input value={featuredSubtitle} onChange={e => setFeaturedSubtitle(e.target.value)} placeholder="Hand-picked just for you" /></FormField>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hand-pick Featured Products (optional)</label>
                    <p className="text-xs text-gray-500 mb-2">Select specific products to feature. Leave empty to auto-select latest.</p>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                      {allProducts.map(p => (
                        <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={featuredProductIds.includes(p.id)}
                            onChange={e => { if (e.target.checked) setFeaturedProductIds([...featuredProductIds, p.id]); else setFeaturedProductIds(featuredProductIds.filter(x => x !== p.id)); }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                          <span className="text-sm text-gray-700">{p.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{currencySymbol}{Number(p.base_price).toFixed(2)}</span>
                        </label>
                      ))}
                      {allProducts.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No products found</p>}
                    </div>
                    {featuredProductIds.length > 0 && <p className="text-xs text-primary-600 mt-1">{featuredProductIds.length} product(s) selected</p>}
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Newsletter / CTA Section</h3>
                  <p className="text-xs text-gray-500 mb-4">The email signup section at the bottom of your homepage.</p>
                  <div className="space-y-3">
                    <FormField label="CTA Headline"><Input value={ctaHeadline} onChange={e => setCtaHeadline(e.target.value)} placeholder="Stay in the Loop" /></FormField>
                    <FormField label="CTA Subtitle"><Input value={ctaSubtitle} onChange={e => setCtaSubtitle(e.target.value)} placeholder="Subscribe for exclusive offers and new arrivals." /></FormField>
                  </div>
                </div>
              </Card>
              {/* ── A/B Testing ── */}
              <Card>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">A/B Testing</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Split-test different hero headlines to see which converts better. Visitors are randomly assigned a variant.</p>
                    </div>
                    <Toggle checked={abTest.enabled} onChange={v => setAbTest(prev => ({ ...prev, enabled: v }))} />
                  </div>
                  {abTest.enabled && (
                    <div className="space-y-4 mt-4">
                      {abTest.variants.map((variant, idx) => (
                        <div key={idx} className="p-4 border border-gray-200 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Variant {String.fromCharCode(65 + idx)}</span>
                            {idx > 1 && (
                              <button onClick={() => setAbTest(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }))}
                                className="text-xs text-red-500 hover:text-red-700">Remove</button>
                            )}
                          </div>
                          <FormField label="Headline">
                            <Input value={variant.headline} onChange={e => {
                              const vs = [...abTest.variants]; vs[idx] = { ...vs[idx], headline: e.target.value }; setAbTest(prev => ({ ...prev, variants: vs }));
                            }} placeholder={idx === 0 ? heroHeadline || 'Original headline' : 'Alternative headline'} />
                          </FormField>
                          <FormField label="Subtitle">
                            <Input value={variant.subtitle} onChange={e => {
                              const vs = [...abTest.variants]; vs[idx] = { ...vs[idx], subtitle: e.target.value }; setAbTest(prev => ({ ...prev, variants: vs }));
                            }} placeholder={idx === 0 ? heroSubtitle || 'Original subtitle' : 'Alternative subtitle'} />
                          </FormField>
                          <FormField label="CTA Button">
                            <Input value={variant.cta} onChange={e => {
                              const vs = [...abTest.variants]; vs[idx] = { ...vs[idx], cta: e.target.value }; setAbTest(prev => ({ ...prev, variants: vs }));
                            }} placeholder={idx === 0 ? heroCta || 'Shop Now' : 'Alternative CTA'} />
                          </FormField>
                        </div>
                      ))}
                      {abTest.variants.length < 4 && (
                        <button onClick={() => setAbTest(prev => ({ ...prev, variants: [...prev.variants, { headline: '', subtitle: '', cta: '' }] }))}
                          className="text-sm text-primary-600 font-semibold hover:text-primary-800 transition">
                          + Add Variant
                        </button>
                      )}
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                        💡 Each visitor is randomly assigned one variant. Results are tracked via standard analytics. Use your GA4 or FB Pixel data to compare conversion rates between variants.
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}

          {/* ════════════ NAVIGATION ════════════ */}
          {activeTab === 'navigation' && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Header Navigation Links</h3>
                <p className="text-xs text-gray-500 mb-4">Manage the links in your store's header. Use relative paths like /store/your-slug/products or full URLs.</p>
                <NavItemEditor items={navItems} onChange={setNavItems} />
                {navItems.length === 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                    💡 No links added — default navigation (Home, Products, Cart) will be shown.
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ════════════ FOOTER ════════════ */}
          {activeTab === 'footer' && (
            <>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Footer Content</h3>
                  <p className="text-xs text-gray-500 mb-4">Customize what appears in your store's footer.</p>
                  <div className="space-y-3">
                    <FormField label="Footer Tagline"><Input value={footerTagline} onChange={e => setFooterTagline(e.target.value)} placeholder={`Powered by ${shop?.name || 'Your Store'}`} /></FormField>
                    <FormField label="Copyright Text"><Input value={footerCopyright} onChange={e => setFooterCopyright(e.target.value)} placeholder={`© ${new Date().getFullYear()} ${shop?.name || 'Your Store'}. All rights reserved.`} /></FormField>
                    <Toggle checked={showPaymentIcons} onChange={setShowPaymentIcons} label="Show payment method icons in footer" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Footer Links</h3>
                  <p className="text-xs text-gray-500 mb-4">Additional links in footer's quick links column.</p>
                  <NavItemEditor items={footerLinks} onChange={setFooterLinks} />
                </div>
              </Card>
            </>
          )}

          {/* ════════════ ANNOUNCEMENT / COUNTDOWN ════════════ */}
          {activeTab === 'announcement' && (
            <>
              <Card>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="font-semibold text-gray-900">Announcement Bar</h3><p className="text-xs text-gray-500 mt-0.5">Show a banner at the top of your store.</p></div>
                    <Toggle checked={announcement.enabled} onChange={v => setAnnouncement({ ...announcement, enabled: v })} />
                  </div>
                  <div className="space-y-3">
                    <FormField label="Announcement Text"><Input value={announcement.text} onChange={e => setAnnouncement({ ...announcement, text: e.target.value })} placeholder="🎉 Free shipping on orders over $50!" /></FormField>
                    <FormField label="Link (optional)"><Input value={announcement.link} onChange={e => setAnnouncement({ ...announcement, link: e.target.value })} placeholder="/products or https://..." /></FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Start Date (optional)">
                        <input type="datetime-local" value={announcement.start_date || ''} onChange={e => setAnnouncement({ ...announcement, start_date: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
                      </FormField>
                      <FormField label="End Date (optional)">
                        <input type="datetime-local" value={announcement.end_date || ''} onChange={e => setAnnouncement({ ...announcement, end_date: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
                      </FormField>
                    </div>
                    <p className="text-[11px] text-gray-400">Leave dates empty to show the announcement indefinitely.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Background Color">
                        <div className="flex items-center gap-2">
                          <input type="color" value={announcement.bg_color} onChange={e => setAnnouncement({ ...announcement, bg_color: e.target.value })} className="w-9 h-9 rounded-lg border cursor-pointer" />
                          <Input value={announcement.bg_color} onChange={e => setAnnouncement({ ...announcement, bg_color: e.target.value })} />
                        </div>
                      </FormField>
                      <FormField label="Text Color">
                        <div className="flex items-center gap-2">
                          <input type="color" value={announcement.text_color} onChange={e => setAnnouncement({ ...announcement, text_color: e.target.value })} className="w-9 h-9 rounded-lg border cursor-pointer" />
                          <Input value={announcement.text_color} onChange={e => setAnnouncement({ ...announcement, text_color: e.target.value })} />
                        </div>
                      </FormField>
                    </div>
                  </div>
                  {announcement.enabled && announcement.text && (
                    <div className="mt-4 p-3 rounded-lg text-center text-sm font-medium" style={{ backgroundColor: announcement.bg_color, color: announcement.text_color }}>{announcement.text}</div>
                  )}
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="font-semibold text-gray-900">Countdown Timer</h3><p className="text-xs text-gray-500 mt-0.5">Show a sale countdown banner below the announcement bar.</p></div>
                    <Toggle checked={countdownEnabled} onChange={setCountdownEnabled} />
                  </div>
                  <div className="space-y-3">
                    <FormField label="Headline"><Input value={countdownHeadline} onChange={e => setCountdownHeadline(e.target.value)} placeholder="🔥 Flash Sale Ends In:" /></FormField>
                    <FormField label="End Date & Time"><input type="datetime-local" value={countdownEndDate} onChange={e => setCountdownEndDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" /></FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Background">
                        <div className="flex items-center gap-2"><input type="color" value={countdownBg} onChange={e => setCountdownBg(e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer" /><Input value={countdownBg} onChange={e => setCountdownBg(e.target.value)} /></div>
                      </FormField>
                      <FormField label="Text Color">
                        <div className="flex items-center gap-2"><input type="color" value={countdownTextColor} onChange={e => setCountdownTextColor(e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer" /><Input value={countdownTextColor} onChange={e => setCountdownTextColor(e.target.value)} /></div>
                      </FormField>
                    </div>
                  </div>
                  {countdownEnabled && countdownHeadline && (
                    <div className="mt-4 p-3 rounded-lg text-center text-sm font-bold" style={{ backgroundColor: countdownBg, color: countdownTextColor }}>
                      {countdownHeadline} <span className="font-mono ml-2">00d 12h 34m 56s</span>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}

          {/* ════════════ SOCIAL & CONTACT ════════════ */}
          {activeTab === 'social' && (
            <>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Social Media Links</h3>
                  <p className="text-xs text-gray-500 mb-4">Shown in the storefront footer and contact section.</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="📘 Facebook"><Input value={socialLinks.facebook} onChange={e => setSocialLinks({ ...socialLinks, facebook: e.target.value })} placeholder="https://facebook.com/yourpage" /></FormField>
                      <FormField label="📸 Instagram"><Input value={socialLinks.instagram} onChange={e => setSocialLinks({ ...socialLinks, instagram: e.target.value })} placeholder="https://instagram.com/your" /></FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="🐦 Twitter / X"><Input value={socialLinks.twitter} onChange={e => setSocialLinks({ ...socialLinks, twitter: e.target.value })} placeholder="https://x.com/yourhandle" /></FormField>
                      <FormField label="🎵 TikTok"><Input value={socialLinks.tiktok} onChange={e => setSocialLinks({ ...socialLinks, tiktok: e.target.value })} placeholder="https://tiktok.com/@you" /></FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="📺 YouTube"><Input value={socialLinks.youtube} onChange={e => setSocialLinks({ ...socialLinks, youtube: e.target.value })} placeholder="https://youtube.com/@you" /></FormField>
                      <FormField label="💬 WhatsApp"><Input value={socialLinks.whatsapp} onChange={e => setSocialLinks({ ...socialLinks, whatsapp: e.target.value })} placeholder="+880XXXXXXXXXX" /></FormField>
                    </div>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Business Contact Info</h3>
                  <p className="text-xs text-gray-500 mb-4">Shown on storefront footer. Enables floating WhatsApp button.</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Phone"><Input value={businessInfo.phone} onChange={e => setBusinessInfo({ ...businessInfo, phone: e.target.value })} placeholder="+880 1XXX XXXXXX" /></FormField>
                      <FormField label="Email"><Input value={businessInfo.email} onChange={e => setBusinessInfo({ ...businessInfo, email: e.target.value })} placeholder="hello@yourshop.com" /></FormField>
                    </div>
                    <FormField label="WhatsApp (floating chat button)"><Input value={businessInfo.whatsapp} onChange={e => setBusinessInfo({ ...businessInfo, whatsapp: e.target.value })} placeholder="+880XXXXXXXXXX" /></FormField>
                    <FormField label="Business Address"><Input value={businessInfo.address} onChange={e => setBusinessInfo({ ...businessInfo, address: e.target.value })} placeholder="123 Main St, Dhaka" /></FormField>
                    <FormField label="Business Hours"><Input value={businessInfo.hours} onChange={e => setBusinessInfo({ ...businessInfo, hours: e.target.value })} placeholder="Mon-Fri: 9am-6pm" /></FormField>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ════════════ STORE CONFIG ════════════ */}
          {activeTab === 'store' && (
            <>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Store Layout</h3>
                  <p className="text-xs text-gray-500 mb-4">Choose the overall page layout for your storefront.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'default', label: 'Standard', desc: 'Full-width centered', icon: '📐' },
                      { id: 'wide', label: 'Wide', desc: 'Extra-wide content', icon: '🖥️' },
                      { id: 'compact', label: 'Compact', desc: 'Narrow & focused', icon: '📱' },
                      { id: 'sidebar', label: 'Sidebar', desc: 'Categories sidebar', icon: '📋' },
                    ].map(l => (
                      <button key={l.id} onClick={() => setStoreLayout(l.id)}
                        className={`p-3 border-2 rounded-xl text-center transition-all ${
                          storeLayout === l.id ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <div className="text-2xl mb-1">{l.icon}</div>
                        <div className="text-sm font-semibold text-gray-900">{l.label}</div>
                        <div className="text-[10px] text-gray-500">{l.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Currency</h3>
                  <p className="text-xs text-gray-500 mb-4">Set how prices are displayed across your store.</p>
                  <div className="space-y-3">
                    <FormField label="Currency Preset">
                      <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" value={currencyCode}
                        onChange={e => { const c = CURRENCIES.find(x => x.code === e.target.value); if (c) { setCurrencyCode(c.code); setCurrencySymbol(c.symbol); } }}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
                      </select>
                    </FormField>
                    <div className="grid grid-cols-3 gap-3">
                      <FormField label="Symbol"><Input value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} /></FormField>
                      <FormField label="Position">
                        <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" value={currencyPosition} onChange={e => setCurrencyPosition(e.target.value)}>
                          <option value="before">Before (৳100)</option>
                          <option value="after">After (100৳)</option>
                        </select>
                      </FormField>
                      <FormField label="Decimals"><Input type="number" min="0" max="4" value={currencyDecimals} onChange={e => setCurrencyDecimals(e.target.value)} /></FormField>
                    </div>
                    <div className="p-3 bg-gray-50 border rounded-lg text-sm">
                      Preview: <span className="font-bold text-primary-600">{currencyPosition === 'after' ? `1,234.${(currencyDecimals > 0 ? '56' : '').slice(0, currencyDecimals)}${currencySymbol}` : `${currencySymbol}1,234.${(currencyDecimals > 0 ? '56' : '').slice(0, currencyDecimals)}`}</span>
                    </div>
                  </div>
                </div>
              </Card>
              {/* ── Secondary Currency (Multi-Currency) ── */}
              <Card>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Secondary Currency</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Show an approximate converted price alongside the primary currency.</p>
                    </div>
                    <Toggle checked={secondaryCurrency.enabled} onChange={v => setSecondaryCurrency(prev => ({ ...prev, enabled: v }))} />
                  </div>
                  {secondaryCurrency.enabled && (
                    <div className="space-y-3 mt-4">
                      <FormField label="Secondary Currency">
                        <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" value={secondaryCurrency.code}
                          onChange={e => { const c = CURRENCIES.find(x => x.code === e.target.value); if (c) setSecondaryCurrency(prev => ({ ...prev, code: c.code, symbol: c.symbol })); }}>
                          {CURRENCIES.filter(c => c.code !== currencyCode).map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
                        </select>
                      </FormField>
                      <FormField label={`Exchange Rate (1 ${currencyCode} = ? ${secondaryCurrency.code})`}>
                        <Input type="number" min="0" step="0.0001" value={secondaryCurrency.rate}
                          onChange={e => setSecondaryCurrency(prev => ({ ...prev, rate: e.target.value }))} placeholder="e.g. 0.0084" />
                        <p className="text-[11px] text-gray-400 mt-1">Enter the exchange rate. For example, if 1 BDT = 0.0084 USD, enter 0.0084.</p>
                      </FormField>
                      <FormField label="Symbol Position">
                        <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" value={secondaryCurrency.position}
                          onChange={e => setSecondaryCurrency(prev => ({ ...prev, position: e.target.value }))}>
                          <option value="before">Before ({secondaryCurrency.symbol}100)</option>
                          <option value="after">After (100{secondaryCurrency.symbol})</option>
                        </select>
                      </FormField>
                      {Number(secondaryCurrency.rate) > 0 && (
                        <div className="p-3 bg-gray-50 border rounded-lg text-sm">
                          Preview: <span className="font-bold text-primary-600">{currencyPosition === 'after' ? `1,000${currencySymbol}` : `${currencySymbol}1,000`}</span>
                          {' '}≈{' '}
                          <span className="font-semibold text-gray-600">
                            {secondaryCurrency.position === 'after'
                              ? `${(1000 * Number(secondaryCurrency.rate)).toFixed(2)}${secondaryCurrency.symbol}`
                              : `${secondaryCurrency.symbol}${(1000 * Number(secondaryCurrency.rate)).toFixed(2)}`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Product Display</h3>
                  <p className="text-xs text-gray-500 mb-4">Control how products are shown on your store.</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField label="Products/Page"><Input type="number" min="4" max="48" value={productsPerPage} onChange={e => setProductsPerPage(e.target.value)} /></FormField>
                    <FormField label="Grid Columns">
                      <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" value={gridColumns} onChange={e => setGridColumns(e.target.value)}>
                        <option value={2}>2 Columns</option><option value={3}>3 Columns</option><option value={4}>4 Columns</option>
                      </select>
                    </FormField>
                    <FormField label="Default Sort">
                      <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" value={defaultSort} onChange={e => setDefaultSort(e.target.value)}>
                        <option value="newest">Newest First</option><option value="price_asc">Price: Low → High</option><option value="price_desc">Price: High → Low</option><option value="name_asc">Name A-Z</option>
                      </select>
                    </FormField>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Toggle checked={showOutOfStock} onChange={setShowOutOfStock} label="Show out-of-stock products" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Checkout & Cart</h3>
                  <p className="text-xs text-gray-500 mb-4">Control cart and checkout behavior.</p>
                  <div className="space-y-3">
                    <FormField label="Minimum Order Amount (optional)"><Input type="number" min="0" step="0.01" value={minOrderAmount} onChange={e => setMinOrderAmount(e.target.value)} placeholder="No minimum" /></FormField>
                    <Toggle checked={guestCheckout} onChange={setGuestCheckout} label="Allow guest checkout (no login required)" />
                    <Toggle checked={cookieConsent} onChange={setCookieConsent} label="Show cookie consent banner" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Shipping Display</h3>
                  <p className="text-xs text-gray-500 mb-4">How shipping cost is shown to customers.</p>
                  <div className="space-y-3">
                    <FormField label="Shipping Mode">
                      <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" value={shippingDisplay} onChange={e => setShippingDisplay(e.target.value)}>
                        <option value="free">Free Shipping (always)</option>
                        <option value="flat">Flat Rate</option>
                        <option value="threshold">Free above threshold</option>
                        <option value="custom">Custom text</option>
                      </select>
                    </FormField>
                    {(shippingDisplay === 'flat' || shippingDisplay === 'threshold') && (
                      <FormField label="Flat Shipping Rate"><Input type="number" min="0" step="0.01" value={flatShippingRate} onChange={e => setFlatShippingRate(e.target.value)} placeholder="e.g. 5.00" /></FormField>
                    )}
                    {shippingDisplay === 'threshold' && (
                      <FormField label="Free Shipping Threshold"><Input type="number" min="0" step="0.01" value={freeShippingThreshold} onChange={e => setFreeShippingThreshold(e.target.value)} placeholder="e.g. 50.00" /></FormField>
                    )}
                    {shippingDisplay === 'custom' && (
                      <FormField label="Custom Shipping Text"><Input value={shippingCustomText} onChange={e => setShippingCustomText(e.target.value)} placeholder="Calculated at checkout" /></FormField>
                    )}
                    <div className="p-3 bg-gray-50 border rounded-lg text-xs text-gray-600">
                      Preview: Shipping — <span className="font-medium">{
                        shippingDisplay === 'free' ? 'Free' :
                        shippingDisplay === 'flat' ? `${currencySymbol}${flatShippingRate || '0'}` :
                        shippingDisplay === 'threshold' ? `Free over ${currencySymbol}${freeShippingThreshold || '0'}, otherwise ${currencySymbol}${flatShippingRate || '0'}` :
                        shippingCustomText || 'Calculated at checkout'
                      }</span>
                    </div>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="font-semibold text-gray-900">Maintenance Mode</h3><p className="text-xs text-gray-500 mt-0.5">Take your store offline temporarily.</p></div>
                    <Toggle checked={maintenanceMode} onChange={setMaintenanceMode} />
                  </div>
                  {maintenanceMode && (
                    <FormField label="Maintenance Message"><Textarea value={maintenanceMessage} onChange={e => setMaintenanceMessage(e.target.value)} placeholder="We're updating our store. We'll be back shortly!" /></FormField>
                  )}
                </div>
              </Card>
            </>
          )}

          {/* ════════════ POLICIES ════════════ */}
          {activeTab === 'policies' && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Store Policies</h3>
                <p className="text-xs text-gray-500 mb-4">Shown as links in your storefront footer and dedicated pages.</p>
                <div className="space-y-4">
                  <FormField label="About Us"><Textarea value={storePolicies.about_us} onChange={e => setStorePolicies({ ...storePolicies, about_us: e.target.value })} placeholder="We are a small business passionate about..." className="!h-24" /></FormField>
                  <FormField label="Return & Refund Policy"><Textarea value={storePolicies.return_policy} onChange={e => setStorePolicies({ ...storePolicies, return_policy: e.target.value })} placeholder="We offer a 30-day return policy..." className="!h-24" /></FormField>
                  <FormField label="Privacy Policy"><Textarea value={storePolicies.privacy_policy} onChange={e => setStorePolicies({ ...storePolicies, privacy_policy: e.target.value })} placeholder="We respect your privacy..." className="!h-24" /></FormField>
                  <FormField label="Terms of Service"><Textarea value={storePolicies.terms} onChange={e => setStorePolicies({ ...storePolicies, terms: e.target.value })} placeholder="By using our store..." className="!h-24" /></FormField>
                </div>
              </div>
            </Card>
          )}

          {/* ════════════ TRUST BADGES ════════════ */}
          {activeTab === 'trust' && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Trust Badges</h3>
                <p className="text-xs text-gray-500 mb-4">Shown on your homepage to build customer confidence.</p>
                <div className="space-y-4">
                  {trustBadges.map((badge, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0"><Input value={badge.icon} onChange={e => { const nb = [...trustBadges]; nb[idx] = { ...nb[idx], icon: e.target.value }; setTrustBadges(nb); }} className="!w-16 text-center text-xl !px-2" /></div>
                      <div className="flex-1 space-y-2">
                        <Input value={badge.title} onChange={e => { const nb = [...trustBadges]; nb[idx] = { ...nb[idx], title: e.target.value }; setTrustBadges(nb); }} placeholder="Badge title" />
                        <Input value={badge.text} onChange={e => { const nb = [...trustBadges]; nb[idx] = { ...nb[idx], text: e.target.value }; setTrustBadges(nb); }} placeholder="Badge description" />
                      </div>
                      <button onClick={() => setTrustBadges(trustBadges.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 self-start mt-2">✕</button>
                    </div>
                  ))}
                  {trustBadges.length < 6 && (
                    <button onClick={() => setTrustBadges([...trustBadges, { icon: '⭐', title: 'New Badge', text: 'Description' }])}
                      className="w-full p-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600 transition">+ Add Trust Badge</button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ════════════ SEO ════════════ */}
          {activeTab === 'seo' && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-1">SEO Defaults</h3>
                <p className="text-xs text-gray-500 mb-4">Default meta tags for search engines.</p>
                <div className="space-y-3">
                  <FormField label="Meta Title"><Input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder={shop?.name || 'Your Store'} /><p className="text-[11px] text-gray-400 mt-1">{seoTitle.length}/60 recommended</p></FormField>
                  <FormField label="Meta Description"><Textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)} placeholder="A brief description of your store..." /><p className="text-[11px] text-gray-400 mt-1">{seoDescription.length}/160 recommended</p></FormField>
                </div>
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Google Preview</p>
                  <p className="text-blue-600 text-base font-medium truncate">{seoTitle || shop?.name || 'Your Store'}</p>
                  <p className="text-xs text-green-700 font-mono truncate">{window.location.origin}{storeUrl || '/store/your-shop'}</p>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{seoDescription || 'Add a meta description for better SEO...'}</p>
                </div>
              </div>
            </Card>
          )}

          {/* ════════════ ANALYTICS ════════════ */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              {/* ── Store Performance Dashboard ── */}
              <Card>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Store Performance</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Real-time overview of your store metrics</p>
                    </div>
                    <select value={dashDays} onChange={e => setDashDays(Number(e.target.value))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
                      <option value={7}>Last 7 days</option>
                      <option value={14}>Last 14 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                  </div>

                  {dashLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
                      {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
                    </div>
                  ) : dashData ? (
                    <>
                      {/* KPI Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        {[
                          { label: 'Total Revenue', value: `৳${Number(dashData.revenue?.total || 0).toLocaleString()}`, icon: '💰', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                          { label: 'Total Orders', value: dashData.orders?.total || 0, icon: '📦', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                          { label: 'Customers', value: dashData.customers?.total || 0, icon: '👥', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                          { label: 'Active Products', value: dashData.products?.active || 0, icon: '🛍️', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                        ].map((kpi, i) => (
                          <div key={i} className={`p-4 rounded-xl border ${kpi.bg} ${kpi.border}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{kpi.icon}</span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{kpi.label}</span>
                            </div>
                            <p className={`text-xl font-bold ${kpi.text}`}>{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Order Status Breakdown */}
                      {dashData.orders?.byStatus && Object.keys(dashData.orders.byStatus).length > 0 && (
                        <div className="mb-5">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Order Status</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(dashData.orders.byStatus).map(([status, count]) => {
                              const colors = { pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800', processing: 'bg-indigo-100 text-indigo-800', shipped: 'bg-cyan-100 text-cyan-800', delivered: 'bg-green-100 text-green-800', completed: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-red-100 text-red-800', refunded: 'bg-gray-100 text-gray-800' };
                              return (
                                <span key={status} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Revenue Timeline (Bar chart) */}
                      {dashTimeline.length > 0 && (
                        <div className="mb-5">
                          <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">Revenue Timeline</h4>
                          <div className="h-32 flex items-end gap-1">
                            {(() => {
                              const maxRev = Math.max(...dashTimeline.map(d => Number(d.revenue)), 1);
                              return dashTimeline.slice(-30).map((d, i) => {
                                const h = Math.max(4, (Number(d.revenue) / maxRev) * 100);
                                return (
                                  <div key={i} className="flex-1 flex flex-col items-center group relative" title={`${d.date}: ৳${Number(d.revenue).toLocaleString()}`}>
                                    <div className="w-full rounded-t transition-all hover:opacity-80" style={{ height: `${h}%`, backgroundColor: '#10b981', minHeight: '2px' }} />
                                    {/* Tooltip */}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                                      ৳{Number(d.revenue).toLocaleString()}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[9px] text-gray-400">{dashTimeline[0]?.date}</span>
                            <span className="text-[9px] text-gray-400">{dashTimeline[dashTimeline.length - 1]?.date}</span>
                          </div>
                        </div>
                      )}

                      {/* Top Products */}
                      {dashData.topProducts?.length > 0 && (
                        <div className="mb-5">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Top Selling Products</h4>
                          <div className="divide-y divide-gray-100">
                            {dashData.topProducts.slice(0, 5).map((p, i) => (
                              <div key={i} className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">#{i + 1}</span>
                                  <span className="text-sm text-gray-800 font-medium truncate max-w-[200px]">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>{p.units_sold} sold</span>
                                  <span className="font-semibold text-emerald-600">৳{Number(p.revenue).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Orders */}
                      {dashData.recentOrders?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Recent Orders</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-100">
                                  <th className="py-2 pr-3 font-medium">Email</th>
                                  <th className="py-2 pr-3 font-medium">Status</th>
                                  <th className="py-2 pr-3 font-medium text-right">Amount</th>
                                  <th className="py-2 font-medium text-right">Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {dashData.recentOrders.slice(0, 5).map((o, i) => (
                                  <tr key={i} className="text-gray-700">
                                    <td className="py-2 pr-3 truncate max-w-[160px]">{o.customer_email}</td>
                                    <td className="py-2 pr-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        o.status === 'completed' || o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                        o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>{o.status}</span>
                                    </td>
                                    <td className="py-2 pr-3 text-right font-medium">৳{Number(o.total_amount).toLocaleString()}</td>
                                    <td className="py-2 text-right text-gray-400">{new Date(o.created_at).toLocaleDateString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-2xl mb-2">📊</p>
                      <p className="text-sm">No dashboard data available yet. Start selling to see performance metrics!</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* ── Tracking Codes ── */}
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Tracking Codes</h3>
                  <p className="text-xs text-gray-500 mb-4">Add tracking IDs to monitor your store with third-party analytics. No code required.</p>
                  <div className="space-y-4">
                    <FormField label="Google Analytics 4 (GA4) Measurement ID">
                      <Input value={ga4Id} onChange={e => setGa4Id(e.target.value)} placeholder="G-XXXXXXXXXX" />
                      <p className="text-[11px] text-gray-400 mt-1">Found in GA4 → Admin → Data Streams → Measurement ID</p>
                    </FormField>
                    <FormField label="Facebook Pixel ID">
                      <Input value={fbPixelId} onChange={e => setFbPixelId(e.target.value)} placeholder="1234567890" />
                      <p className="text-[11px] text-gray-400 mt-1">Found in Meta Events Manager → Pixel settings</p>
                    </FormField>
                    <FormField label="Google Tag Manager ID">
                      <Input value={gtmId} onChange={e => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX" />
                      <p className="text-[11px] text-gray-400 mt-1">Found in GTM → Workspace → Container ID</p>
                    </FormField>
                  </div>
                  {(ga4Id || fbPixelId || gtmId) && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                      ✅ Active tracking: {[ga4Id && 'GA4', fbPixelId && 'Facebook Pixel', gtmId && 'GTM'].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ════════════ POPUPS ════════════ */}
          {activeTab === 'popups' && (
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div><h3 className="font-semibold text-gray-900">Welcome Popup</h3><p className="text-xs text-gray-500 mt-0.5">Greet first-time visitors with a special offer or message.</p></div>
                  <Toggle checked={popupEnabled} onChange={setPopupEnabled} />
                </div>
                <div className="space-y-3">
                  <FormField label="Headline"><Input value={popupHeadline} onChange={e => setPopupHeadline(e.target.value)} placeholder="Welcome! 🎉" /></FormField>
                  <FormField label="Body"><Textarea value={popupBody} onChange={e => setPopupBody(e.target.value)} placeholder="Get 10% off your first order..." className="!h-20" /></FormField>
                  <FormField label="Discount Code (optional)"><Input value={popupDiscountCode} onChange={e => setPopupDiscountCode(e.target.value)} placeholder="WELCOME10" /></FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="CTA Button Text"><Input value={popupCtaText} onChange={e => setPopupCtaText(e.target.value)} placeholder="Shop Now" /></FormField>
                    <FormField label="CTA Link"><Input value={popupCtaLink} onChange={e => setPopupCtaLink(e.target.value)} placeholder="/products" /></FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Delay (seconds)"><Input type="number" min="0" max="60" value={popupDelay} onChange={e => setPopupDelay(e.target.value)} /></FormField>
                    <div className="mt-6"><Toggle checked={popupShowOnce} onChange={setPopupShowOnce} label="Show only once per visitor" /></div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ════════════ ADVANCED ════════════ */}
          {activeTab === 'advanced' && (
            <>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">Export / Import Settings</h3>
                  <p className="text-xs text-gray-500 mb-3">Backup your settings or transfer them between shops.</p>
                  <div className="flex gap-2 mb-3">
                    <Button variant="secondary" size="sm" onClick={() => {
                      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `website-settings-${new Date().toISOString().slice(0,10)}.json`;
                      a.click(); URL.revokeObjectURL(url);
                    }}>
                      Export JSON
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file'; input.accept = '.json';
                      input.onchange = async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const text = await file.text();
                          const data = JSON.parse(text);
                          if (!data.template) { setError('Invalid settings file'); return; }
                          const updated = await websiteSettings.update(data);
                          setSettings(updated);
                          setSuccess('Settings imported! Reload to see changes.');
                          setTimeout(() => window.location.reload(), 1500);
                        } catch { setError('Failed to import settings. Please check the file format.'); }
                      };
                      input.click();
                    }}>
                      Import JSON
                    </Button>
                  </div>
                  <p className="text-[11px] text-gray-400">Export saves all your current settings. Import will overwrite your current configuration.</p>
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
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                    <p className="text-xs text-amber-700 font-medium">⚠️ Custom JS is stripped for security. Use the Analytics tab to add Google Analytics, Facebook Pixel, or Google Tag Manager instead.</p>
                  </div>
                  <Textarea value={customJs} onChange={e => setCustomJs(e.target.value)} className="font-mono text-xs !h-28 opacity-60" placeholder="// Disabled for security — use Analytics tab instead" disabled />
                </div>
              </Card>
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">System Info</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-gray-500">Template</p><p className="font-medium capitalize">{selectedTemplate.replace(/_/g, ' ')}</p>
                    <p className="text-gray-500">Templates Available</p><p className="font-medium">{Object.keys(templates).length}</p>
                    <p className="text-gray-500">Color Overrides</p><p className="font-medium">{overrideCount}</p>
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
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /><div className="w-2.5 h-2.5 rounded-full bg-green-400" /></div>
                  <span className="text-xs text-gray-400 font-mono ml-2">{shop ? `${shop.slug}.ecomai.dev` : 'store preview'}</span>
                </div>
                {storeUrl && <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:text-primary-700 font-medium">Open ↗</a>}
              </div>
              <div className="relative bg-gray-100" style={{ height: '600px' }}>
                {storeUrl ? (
                  <iframe ref={iframeRef} src={storeUrl} className="w-full h-full border-0" title="Store Preview" />
                ) : (
                  <div className="flex items-center justify-center h-full text-center p-6">
                    <div><div className="text-5xl mb-4">🎨</div><p className="text-sm font-medium text-gray-600">Live Preview</p><p className="text-xs text-gray-400 mt-1">Preview appears after you save with a shop slug.</p></div>
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
