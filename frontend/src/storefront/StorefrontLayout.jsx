import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { resolveTokens, tokensToCssVars } from './templates';

export default function StorefrontLayout() {
  const { shop, theme, tokens, nav, footer, customCss, customJs, seoDefaults, loading, error, shopSlug } = useStore();
  const { count } = useCart();
  const navigate = useNavigate();
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

          {/* Mobile nav */}
          <nav className="flex md:hidden items-center gap-4 pb-3 overflow-x-auto">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium whitespace-nowrap hover:opacity-70 transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        className="mt-auto"
        style={{
          backgroundColor: resolved.footerBg,
          color: resolved.footerText,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: resolved.primary }}>{shop?.name}</h3>
              <p className="text-sm opacity-70">
                {footer.tagline || 'Powered by Ecomai — Multi-tenant Commerce Platform'}
              </p>
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
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-60">Contact</h4>
              <p className="text-sm opacity-70">{footer.contact_email || `support@${shop?.slug}.ecomai.dev`}</p>
              {footer.contact_phone && <p className="text-sm opacity-70 mt-1">{footer.contact_phone}</p>}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t text-sm text-center opacity-50" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {footer.copyright || `\u00A9 ${new Date().getFullYear()} ${shop?.name}. All rights reserved.`}
          </div>
        </div>
      </footer>
    </div>
  );
}
