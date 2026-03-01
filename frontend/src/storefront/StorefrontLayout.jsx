import { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { resolveTokens, tokensToCssVars, getGoogleFontsUrl } from './templates';
import { SocialLinks, PaymentIcons, WhatsAppIcon } from './icons';

/* ── Countdown Timer Bar ── */
function CountdownBar({ countdown }) {
  const [timeLeft, setTimeLeft] = useState({});
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const tick = () => {
      const end = new Date(countdown.end_date).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) { setExpired(true); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [countdown.end_date]);
  if (expired) return null;
  return (
    <div className="text-center py-2 px-4 text-sm font-bold" style={{ backgroundColor: countdown.bg_color || '#ef4444', color: countdown.text_color || '#fff' }}>
      {countdown.headline || 'Sale Ends In:'}{' '}
      <span className="font-mono ml-2">{String(timeLeft.d || 0).padStart(2, '0')}d {String(timeLeft.h || 0).padStart(2, '0')}h {String(timeLeft.m || 0).padStart(2, '0')}m {String(timeLeft.s || 0).padStart(2, '0')}s</span>
    </div>
  );
}

/* ── Cookie Consent Banner ── */
function CookieConsent({ t }) {
  const [show, setShow] = useState(false);
  useEffect(() => { if (!localStorage.getItem('cookie_consent')) setShow(true); }, []);
  if (!show) return null;
  const accept = () => { localStorage.setItem('cookie_consent', '1'); setShow(false); };
  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-4 shadow-xl" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius }}>
      <p className="text-sm mb-3" style={{ color: t.text }}>We use cookies to improve your experience. By continuing to browse, you consent to our use of cookies.</p>
      <div className="flex gap-2">
        <button onClick={accept} className="px-4 py-2 text-sm font-semibold transition hover:opacity-80" style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}>Accept</button>
        <button onClick={() => setShow(false)} className="px-4 py-2 text-sm font-medium transition hover:opacity-70" style={{ color: t.textMuted, border: `1px solid ${t.border}`, borderRadius: t.buttonRadius }}>Dismiss</button>
      </div>
    </div>
  );
}

/* ── Welcome Popup ── */
function WelcomePopup({ config, t, shopSlug }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (config.show_once && sessionStorage.getItem(`popup_seen_${shopSlug}`)) return;
    const timer = setTimeout(() => setShow(true), (config.delay_seconds || 5) * 1000);
    return () => clearTimeout(timer);
  }, [config, shopSlug]);
  if (!show) return null;
  const close = () => {
    setShow(false);
    if (config.show_once) sessionStorage.setItem(`popup_seen_${shopSlug}`, '1');
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={close}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm p-6 text-center shadow-2xl animate-[slideIn_0.3s_ease]" style={{ backgroundColor: t.surface, borderRadius: t.radius }} onClick={e => e.stopPropagation()}>
        <button onClick={close} className="absolute top-3 right-3 text-lg hover:opacity-70" style={{ color: t.textMuted }}>✕</button>
        {config.headline && <h3 className="text-xl font-bold mb-2" style={{ color: t.text }}>{config.headline}</h3>}
        {config.body && <p className="text-sm mb-4" style={{ color: t.textMuted }}>{config.body}</p>}
        {config.discount_code && (
          <div className="mb-4 p-3 font-mono text-sm font-bold tracking-wider" style={{ backgroundColor: `${t.primary}10`, color: t.primary, borderRadius: t.radius, border: `2px dashed ${t.primary}40` }}>
            {config.discount_code}
          </div>
        )}
        {config.cta_text && (
          <Link to={config.cta_link || `/store/${shopSlug}/products`} onClick={close} className="inline-block px-6 py-2.5 text-sm font-semibold transition hover:opacity-80" style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}>
            {config.cta_text}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN LAYOUT
   ═══════════════════════════════════════════════ */
export default function StorefrontLayout() {
  const {
    shop, theme, tokens, nav, footer, customCss, customJs,
    seoDefaults, socialLinks, businessInfo, announcement, storePolicies,
    storeConfig, analyticsConfig, popupConfig, countdown, formatPrice,
    loading, error, shopSlug,
  } = useStore();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [customerToken, setCustomerToken] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem(`customer_token_${shopSlug}`);
    setCustomerToken(token);
    const onStorage = () => setCustomerToken(localStorage.getItem(`customer_token_${shopSlug}`));
    window.addEventListener('storage', onStorage);
    const interval = setInterval(onStorage, 1000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
  }, [shopSlug]);

  /* Apply SEO defaults + favicon to document head */
  useEffect(() => {
    if (seoDefaults.title) document.title = seoDefaults.title;
    else if (shop?.name) document.title = shop.name;
    else document.title = 'Ecomai — Commerce Platform';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (seoDefaults.description && metaDesc) metaDesc.setAttribute('content', seoDefaults.description);
    // Favicon
    if (seoDefaults.favicon_url) {
      let fav = document.querySelector('link[rel="icon"]');
      if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
      fav.href = seoDefaults.favicon_url;
    }
    // OG image
    if (seoDefaults.og_image_url) {
      let og = document.querySelector('meta[property="og:image"]');
      if (!og) { og = document.createElement('meta'); og.setAttribute('property', 'og:image'); document.head.appendChild(og); }
      og.setAttribute('content', seoDefaults.og_image_url);
    }
  }, [seoDefaults, shop]);

  /* Inject custom JS - sandboxed in try/catch, admin-controlled */
  useEffect(() => {
    if (!customJs || typeof customJs !== 'string') return;
    // Limit custom JS size to prevent abuse
    const safe = customJs.slice(0, 10000);
    const script = document.createElement('script');
    script.textContent = `try{${safe}}catch(e){console.warn('[store-custom-js]',e.message)}`;
    script.setAttribute('data-store-custom', 'true');
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [customJs]);

  /* Inject analytics (GA4, FB Pixel, GTM) — validate IDs to prevent injection */
  useEffect(() => {
    if (!analyticsConfig) return;
    const scripts = [];
    const addScript = (src, text) => {
      const el = document.createElement('script');
      if (src) { el.async = true; el.src = src; }
      if (text) el.textContent = text;
      el.setAttribute('data-analytics', 'true');
      document.head.appendChild(el);
      scripts.push(el);
    };
    const GA4_RE = /^G-[A-Z0-9]{4,12}$/;
    const FB_RE = /^[0-9]{10,20}$/;
    const GTM_RE = /^GTM-[A-Z0-9]{4,10}$/;
    if (analyticsConfig.ga4_id && GA4_RE.test(analyticsConfig.ga4_id)) {
      addScript(`https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.ga4_id}`);
      addScript(null, `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analyticsConfig.ga4_id}');`);
    }
    if (analyticsConfig.fb_pixel_id && FB_RE.test(analyticsConfig.fb_pixel_id)) {
      addScript(null, `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${analyticsConfig.fb_pixel_id}');fbq('track','PageView');`);
    }
    if (analyticsConfig.gtm_id && GTM_RE.test(analyticsConfig.gtm_id)) {
      addScript(null, `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${analyticsConfig.gtm_id}');`);
    }
    return () => scripts.forEach(s => s.remove());
  }, [analyticsConfig]);

  const resolved = resolveTokens(theme, tokens);
  const cssVars = tokensToCssVars(resolved);
  const fontsUrl = getGoogleFontsUrl(resolved);
  const storeLayout = storeConfig?.store_layout || 'default';
  const layoutMaxW = storeLayout === 'wide' ? 'max-w-[1440px]' : storeLayout === 'compact' ? 'max-w-4xl' : 'max-w-7xl';

  /* PWA Manifest — dynamic per-store */
  useEffect(() => {
    if (!shop?.name) return;
    const manifest = {
      name: shop.name,
      short_name: shop.name.substring(0, 12),
      start_url: `/store/${shopSlug}`,
      display: 'standalone',
      background_color: resolved?.bg || '#ffffff',
      theme_color: resolved?.primary || '#2563eb',
      icons: [
        ...(seoDefaults.favicon_url ? [
          { src: seoDefaults.favicon_url, sizes: '192x192', type: 'image/png' },
          { src: seoDefaults.favicon_url, sizes: '512x512', type: 'image/png' },
        ] : []),
      ],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    let link = document.querySelector('link[rel="manifest"][data-store-pwa]');
    if (!link) { link = document.createElement('link'); link.rel = 'manifest'; link.setAttribute('data-store-pwa', 'true'); document.head.appendChild(link); }
    link.href = url;
    let meta = document.querySelector('meta[name="theme-color"][data-store-pwa]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; meta.setAttribute('data-store-pwa', 'true'); document.head.appendChild(meta); }
    meta.content = resolved?.primary || '#2563eb';
    return () => { URL.revokeObjectURL(url); };
  }, [shop, shopSlug, seoDefaults, resolved]);

  /* ── Live Preview: listen for postMessage from WebsiteSettings ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'ecomai_preview' && e.data.tokens) {
        const preview = e.data.tokens;
        const root = document.querySelector('.storefront');
        if (!root) return;
        Object.entries(preview).forEach(([key, value]) => {
          const varName = `--store-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          root.style.setProperty(varName, value);
        });
        if (preview.fontFamily) root.style.setProperty('--font-family', preview.fontFamily);
        if (preview.headingFont) root.style.setProperty('--heading-font', preview.headingFont);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  /* ── Early returns (after all hooks) ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Store Not Found</h1>
          <p className="text-gray-500">This shop doesn't exist or is no longer active.</p>
          <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">Go home</Link>
        </div>
      </div>
    );
  }

  /* Maintenance mode */
  if (storeConfig?.maintenance_mode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="text-7xl mb-6">🚧</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Under Maintenance</h1>
          <p className="text-gray-600 leading-relaxed">{storeConfig.maintenance_message || "We're updating our store. We'll be back shortly!"}</p>
        </div>
      </div>
    );
  }

  const navLinks = (nav.nav && nav.nav.length > 0) ? nav.nav.map(l => ({ ...l, to: l.url || l.to })) : [
    { label: 'Home', to: `/store/${shopSlug}` },
    { label: 'Products', to: `/store/${shopSlug}/products` },
    { label: 'Cart', to: `/store/${shopSlug}/cart` },
  ];

  return (
    <div className="storefront min-h-screen flex flex-col">
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
      <style>{`
        .storefront { ${cssVars} --font-family: ${resolved.fontFamily}; --heading-font: ${resolved.headingFont || resolved.fontFamily}; font-family: var(--font-family); background-color: var(--store-bg); color: var(--store-text); }
        .storefront h1, .storefront h2, .storefront h3, .storefront h4 { font-family: var(--heading-font); }
        .storefront a { color: inherit; }
        @keyframes slideIn { from { opacity:0; transform: translateY(20px) scale(0.95); } to { opacity:1; transform: translateY(0) scale(1); } }
        ${customCss}
      `}</style>

      {/* JSON-LD Structured Data */}
      {shop && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: shop.name,
          url: `${window.location.origin}/store/${shopSlug}`,
          ...(nav.logo_url ? { logo: nav.logo_url } : {}),
          ...(seoDefaults.description ? { description: seoDefaults.description } : {}),
          ...(businessInfo.email ? { email: businessInfo.email } : {}),
          ...(businessInfo.phone ? { telephone: businessInfo.phone } : {}),
          ...(businessInfo.address ? { address: { '@type': 'PostalAddress', streetAddress: businessInfo.address } } : {}),
          ...(socialLinks ? { sameAs: Object.values(socialLinks).filter(Boolean) } : {}),
        }) }} />
      )}

      {/* Announcement Bar */}
      {announcement?.enabled && announcement?.text && (() => {
        const now = Date.now();
        if (announcement.start_date && new Date(announcement.start_date).getTime() > now) return null;
        if (announcement.end_date && new Date(announcement.end_date).getTime() < now) return null;
        return (
          <div className="text-center text-sm font-medium py-2 px-4" style={{ backgroundColor: announcement.bg_color || '#4f46e5', color: announcement.text_color || '#ffffff' }}>
            {announcement.link ? <Link to={announcement.link} className="hover:underline">{announcement.text}</Link> : <span>{announcement.text}</span>}
          </div>
        );
      })()}

      {/* Countdown Timer */}
      {countdown?.enabled && countdown?.end_date && new Date(countdown.end_date) > new Date() && (
        <CountdownBar countdown={countdown} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: resolved.headerBg, color: resolved.headerText, borderColor: resolved.border }}>
        <div className={`${layoutMaxW} mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="flex items-center justify-between h-16">
            {/* Logo / shop name */}
            <Link to={`/store/${shopSlug}`} className={`flex items-center gap-2.5 hover:opacity-80 transition ${nav.layout === 'center' ? '' : ''}`}>
              {nav.logo_url && (
                <img src={nav.logo_url} alt={shop?.name || 'Store'} style={{ height: `${nav.logo_height || 40}px` }} className="object-contain" />
              )}
              {(nav.show_name !== false) && (
                <span className="text-xl font-bold tracking-tight" style={{ color: resolved.primary }}>{shop?.name}</span>
              )}
              {!nav.logo_url && nav.show_name === false && (
                <span className="text-xl font-bold tracking-tight" style={{ color: resolved.primary }}>{shop?.name}</span>
              )}
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link, i) => (
                <Link key={link.to || i} to={link.to || link.url || '#'} className="text-sm font-medium hover:opacity-70 transition">
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Account & Cart */}
            <div className="flex items-center gap-3">
              {customerToken ? (
                <Link to={`/store/${shopSlug}/account`} className="text-sm font-medium px-3 py-2 rounded-lg transition hover:opacity-80" style={{ border: `1px solid ${resolved.border}`, borderRadius: resolved.buttonRadius }}>
                  My Account
                </Link>
              ) : (
                <Link to={`/store/${shopSlug}/auth/login`} className="text-sm font-medium px-3 py-2 rounded-lg transition hover:opacity-80" style={{ border: `1px solid ${resolved.border}`, borderRadius: resolved.buttonRadius }}>
                  Sign In
                </Link>
              )}
              <button onClick={() => navigate(`/store/${shopSlug}/cart`)} className="relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition hover:opacity-80"
                style={{ backgroundColor: resolved.primary, color: resolved.bg, borderRadius: resolved.buttonRadius }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                Cart
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full" style={{ backgroundColor: resolved.accent, color: resolved.bg }}>
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0">
        {storeLayout === 'sidebar' ? (
          <div className={`${layoutMaxW} mx-auto px-4 sm:px-6 lg:px-8 py-6`}>
            <div className="flex gap-6">
              <aside className="hidden md:block w-56 shrink-0">
                <div className="sticky top-20 space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider opacity-60" style={{ color: resolved.textMuted }}>Browse</h4>
                  <nav className="space-y-1">
                    {navLinks.map((link, i) => (
                      <Link key={link.to || i} to={link.to || link.url || '#'} className="block px-3 py-2 text-sm rounded-lg transition hover:opacity-70" style={{ color: resolved.text }}>
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              </aside>
              <div className="flex-1 min-w-0"><Outlet /></div>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Footer — hidden on mobile (bottom nav replaces it) */}
      <footer className="mt-auto hidden md:block" style={{ backgroundColor: resolved.footerBg, color: resolved.footerText }}>
        <div className={`${layoutMaxW} mx-auto px-4 sm:px-6 lg:px-8 py-12`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              {nav.logo_url && <img src={nav.logo_url} alt="" className="h-8 object-contain mb-3 opacity-80" />}
              <h3 className="text-lg font-bold mb-3" style={{ color: resolved.primary }}>{shop?.name}</h3>
              <p className="text-sm opacity-70">{footer.tagline || 'Powered by Ecomai — Multi-tenant Commerce Platform'}</p>
              {Object.values(socialLinks).some(Boolean) && (
                <SocialLinks links={socialLinks} size={18} className="mt-4" />
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-60">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to={`/store/${shopSlug}`} className="hover:opacity-70 transition">Home</Link></li>
                <li><Link to={`/store/${shopSlug}/products`} className="hover:opacity-70 transition">Products</Link></li>
                <li><Link to={`/store/${shopSlug}/cart`} className="hover:opacity-70 transition">Cart</Link></li>
                <li><Link to={`/store/${shopSlug}/account`} className="hover:opacity-70 transition">My Account</Link></li>
                {(footer.links || []).map((l, i) => (
                  <li key={i}><Link to={l.url || l.to || '#'} className="hover:opacity-70 transition">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-60">Policies</h4>
              <ul className="space-y-2 text-sm">
                {storePolicies.about_us && <li><Link to={`/store/${shopSlug}/policy/about`} className="hover:opacity-70 transition">About Us</Link></li>}
                {storePolicies.return_policy && <li><Link to={`/store/${shopSlug}/policy/return`} className="hover:opacity-70 transition">Return Policy</Link></li>}
                {storePolicies.privacy_policy && <li><Link to={`/store/${shopSlug}/policy/privacy`} className="hover:opacity-70 transition">Privacy Policy</Link></li>}
                {storePolicies.terms && <li><Link to={`/store/${shopSlug}/policy/terms`} className="hover:opacity-70 transition">Terms of Service</Link></li>}
                {!storePolicies.about_us && !storePolicies.return_policy && !storePolicies.privacy_policy && !storePolicies.terms && (
                  <li className="opacity-50">No policies set up yet</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-60">Contact</h4>
              <div className="space-y-2 text-sm opacity-70">
                <p>{businessInfo.email || footer.contact_email || `support@${shop?.slug}.ecomai.dev`}</p>
                {(businessInfo.phone || footer.contact_phone) && <p>{businessInfo.phone || footer.contact_phone}</p>}
                {businessInfo.address && <p>{businessInfo.address}</p>}
                {businessInfo.hours && <p className="mt-2 text-xs opacity-80">Hours: {businessInfo.hours}</p>}
              </div>
            </div>
          </div>
          {footer.show_payment_icons !== false && (
            <div className="mt-6">
              <PaymentIcons className="opacity-60" />
            </div>
          )}
          <div className="mt-6 pt-6 border-t text-sm text-center opacity-50" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {footer.copyright || `\u00A9 ${new Date().getFullYear()} ${shop?.name}. All rights reserved.`}
          </div>
        </div>
      </footer>

      {/* ── Mobile Bottom Navigation ── */}
      {(() => {
        const basePath = `/store/${shopSlug}`;
        const path = location.pathname;
        const isActive = (p) => {
          if (p === basePath) return path === basePath || path === basePath + '/';
          return path.startsWith(p);
        };
        const bottomTabs = [
          { label: 'Home', to: basePath, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
          { label: 'Products', to: `${basePath}/products`, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
          { label: 'Cart', to: `${basePath}/cart`, icon: <div className="relative"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>{count > 0 && <span className="absolute -top-2 -right-2 w-4.5 h-4.5 flex items-center justify-center text-[10px] font-bold rounded-full" style={{ backgroundColor: resolved.accent || resolved.primary, color: resolved.bg, minWidth: '18px', height: '18px' }}>{count}</span>}</div> },
          { label: customerToken ? 'Account' : 'Sign In', to: customerToken ? `${basePath}/account` : `${basePath}/auth/login`, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        ];
        return (
          <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ backgroundColor: resolved.headerBg, borderTop: `1px solid ${resolved.border}`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
              {bottomTabs.map((tab) => {
                const active = isActive(tab.to);
                return (
                  <Link key={tab.to} to={tab.to} className="flex flex-col items-center justify-center flex-1 py-1 transition-all" style={{ color: active ? resolved.primary : resolved.textMuted }}>
                    <div className={`p-1 rounded-xl transition-all ${active ? 'scale-110' : ''}`} style={active ? { backgroundColor: `${resolved.primary}12` } : {}}>
                      {tab.icon}
                    </div>
                    <span className="text-[10px] font-semibold mt-0.5 leading-tight">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="h-safe-area" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
          </nav>
        );
      })()}

      {/* WhatsApp Floating Button */}
      {(businessInfo.whatsapp || socialLinks.whatsapp) && (
        <a href={`https://wa.me/${(businessInfo.whatsapp || socialLinks.whatsapp).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
          style={{ backgroundColor: '#25D366', color: '#fff' }} title="Chat on WhatsApp">
          <WhatsAppIcon size={24} />
        </a>
      )}

      {/* Cookie Consent */}
      {storeConfig?.cookie_consent && <CookieConsent t={resolved} />}

      {/* Welcome Popup */}
      {popupConfig?.enabled && <WelcomePopup config={popupConfig} t={resolved} shopSlug={shopSlug} />}
    </div>
  );
}
