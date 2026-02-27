import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { resolveTokens, tokensToCssVars } from './templates';

export default function StorefrontLayout() {
  const { shop, theme, tokens, nav, footer, customCss, customJs, seoDefaults, socialLinks, businessInfo, announcement, storePolicies, loading, error, shopSlug } = useStore();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [customerToken, setCustomerToken] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem(`customer_token_${shopSlug}`);
    setCustomerToken(token);
    const onStorage = () => setCustomerToken(localStorage.getItem(`customer_token_${shopSlug}`));
    window.addEventListener('storage', onStorage);
    // Also poll for same-tab changes
    const interval = setInterval(onStorage, 1000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
  }, [shopSlug]);

  /* Apply SEO defaults to document head */
  useEffect(() => {
    if (seoDefaults.title) document.title = seoDefaults.title;
    else if (shop?.name) document.title = shop.name;
    else document.title = 'Ecomai — Commerce Platform';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (seoDefaults.description && metaDesc) metaDesc.setAttribute('content', seoDefaults.description);
  }, [seoDefaults, shop]);

  /* Inject custom JS safely */
  useEffect(() => {
    if (!customJs) return;
    const script = document.createElement('script');
    script.textContent = customJs;
    script.setAttribute('data-store-custom', 'true');
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [customJs]);

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
          <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const resolved = resolveTokens(theme, tokens);
  const cssVars = tokensToCssVars(resolved);

  const navLinks = nav.links || [
    { label: 'Home', to: `/store/${shopSlug}` },
    { label: 'Products', to: `/store/${shopSlug}/products` },
    { label: 'Cart', to: `/store/${shopSlug}/cart` },
  ];

  return (
    <div
      className="storefront min-h-screen flex flex-col"
      style={{ cssText: undefined }}
    >
      {/* Inject CSS vars + custom CSS */}
      <style>{`
        .storefront {
          ${cssVars}
          --font-family: ${resolved.fontFamily};
          font-family: var(--font-family);
          background-color: var(--store-bg);
          color: var(--store-text);
        }
        .storefront a { color: inherit; }
        ${customCss}
      `}</style>

      {/* Announcement Bar */}
      {announcement?.enabled && announcement?.text && (
        <div
          className="text-center text-sm font-medium py-2 px-4"
          style={{ backgroundColor: announcement.bg_color || '#4f46e5', color: announcement.text_color || '#ffffff' }}
        >
          {announcement.link ? (
            <Link to={announcement.link} className="hover:underline">{announcement.text}</Link>
          ) : (
            <span>{announcement.text}</span>
          )}
        </div>
      )}

      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: resolved.headerBg,
          color: resolved.headerText,
          borderColor: resolved.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / shop name */}
            <Link
              to={`/store/${shopSlug}`}
              className="text-xl font-bold tracking-tight hover:opacity-80 transition"
              style={{ color: resolved.primary }}
            >
              {shop?.name}
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm font-medium hover:opacity-70 transition"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Account & Cart */}
            <div className="flex items-center gap-3">
              {customerToken ? (
                <Link
                  to={`/store/${shopSlug}/account`}
                  className="text-sm font-medium px-3 py-2 rounded-lg transition hover:opacity-80"
                  style={{ border: `1px solid ${resolved.border}`, borderRadius: resolved.buttonRadius }}
                >
                  My Account
                </Link>
              ) : (
                <Link
                  to={`/store/${shopSlug}/auth/login`}
                  className="text-sm font-medium px-3 py-2 rounded-lg transition hover:opacity-80"
                  style={{ border: `1px solid ${resolved.border}`, borderRadius: resolved.buttonRadius }}
                >
                  Sign In
                </Link>
              )}
              <button
                onClick={() => navigate(`/store/${shopSlug}/cart`)}
                className="relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition hover:opacity-80"
                style={{
                  backgroundColor: resolved.primary,
                  color: resolved.bg,
                  borderRadius: resolved.buttonRadius,
                }}
              >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Cart
              {count > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full"
                  style={{ backgroundColor: resolved.accent, color: resolved.bg }}
                >
                  {count}
                </span>
              )}
            </button>
            </div>
          </div>

          {/* Mobile nav links hidden — replaced by bottom navigation bar */}
        </div>
      </header>

      {/* Main content — extra bottom padding on mobile for the bottom nav */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Footer — hidden on mobile (bottom nav replaces it) */}
      <footer
        className="mt-auto hidden md:block"
        style={{
          backgroundColor: resolved.footerBg,
          color: resolved.footerText,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: resolved.primary }}>{shop?.name}</h3>
              <p className="text-sm opacity-70">
                {footer.tagline || 'Powered by Ecomai — Multi-tenant Commerce Platform'}
              </p>
              {/* Social Links */}
              {Object.values(socialLinks).some(Boolean) && (
                <div className="flex items-center gap-3 mt-4">
                  {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition" title="Facebook">📘</a>}
                  {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition" title="Instagram">📸</a>}
                  {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition" title="Twitter">🐦</a>}
                  {socialLinks.tiktok && <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition" title="TikTok">🎵</a>}
                  {socialLinks.youtube && <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition" title="YouTube">📺</a>}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-60">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to={`/store/${shopSlug}`} className="hover:opacity-70 transition">Home</Link></li>
                <li><Link to={`/store/${shopSlug}/products`} className="hover:opacity-70 transition">Products</Link></li>
                <li><Link to={`/store/${shopSlug}/cart`} className="hover:opacity-70 transition">Cart</Link></li>
                <li><Link to={`/store/${shopSlug}/account`} className="hover:opacity-70 transition">My Account</Link></li>
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
          <div className="mt-8 pt-6 border-t text-sm text-center opacity-50" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
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
          {
            label: 'Home',
            to: basePath,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            ),
          },
          {
            label: 'Products',
            to: `${basePath}/products`,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            ),
          },
          {
            label: 'Cart',
            to: `${basePath}/cart`,
            icon: (
              <div className="relative">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 w-4.5 h-4.5 flex items-center justify-center text-[10px] font-bold rounded-full"
                    style={{ backgroundColor: resolved.accent || resolved.primary, color: resolved.bg, minWidth: '18px', height: '18px' }}>
                    {count}
                  </span>
                )}
              </div>
            ),
          },
          {
            label: customerToken ? 'Account' : 'Sign In',
            to: customerToken ? `${basePath}/account` : `${basePath}/auth/login`,
            icon: (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ),
          },
        ];

        return (
          <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
            style={{
              backgroundColor: resolved.headerBg,
              borderTop: `1px solid ${resolved.border}`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}>
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
              {bottomTabs.map((tab) => {
                const active = isActive(tab.to);
                return (
                  <Link key={tab.to} to={tab.to}
                    className="flex flex-col items-center justify-center flex-1 py-1 transition-all"
                    style={{ color: active ? resolved.primary : resolved.textMuted }}>
                    <div className={`p-1 rounded-xl transition-all ${active ? 'scale-110' : ''}`}
                      style={active ? { backgroundColor: `${resolved.primary}12` } : {}}>
                      {tab.icon}
                    </div>
                    <span className="text-[10px] font-semibold mt-0.5 leading-tight">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
            {/* Safe area for notched phones */}
            <div className="h-safe-area" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
          </nav>
        );
      })()}

      {/* WhatsApp Floating Button — positioned above bottom nav on mobile */}
      {(businessInfo.whatsapp || socialLinks.whatsapp) && (
        <a
          href={`https://wa.me/${(businessInfo.whatsapp || socialLinks.whatsapp).replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full shadow-lg text-xl md:text-2xl transition-transform hover:scale-110"
          style={{ backgroundColor: '#25D366', color: '#fff' }}
          title="Chat on WhatsApp"
        >
          💬
        </a>
      )}
    </div>
  );
}
