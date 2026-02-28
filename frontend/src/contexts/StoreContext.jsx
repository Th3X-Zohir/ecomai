import { createContext, useContext, useState, useEffect } from 'react';
import { storeApi } from '../api-public';

const StoreContext = createContext(null);

export function StoreProvider({ shopSlug, children }) {
  const [shop, setShop] = useState(null);
  const [siteSettings, setSiteSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      storeApi.getShop(shopSlug),
      storeApi.getSettings(shopSlug),
    ])
      .then(([shopData, settingsData]) => {
        setShop(shopData);
        setSiteSettings(settingsData || {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [shopSlug]);

  /* Map DB column names → context values consumed by storefront components.
     DB columns: template, theme (JSONB), header (JSONB), footer (JSONB),
                 homepage (JSONB), custom_css, custom_js, seo_defaults (JSONB) */
  const theme = siteSettings.template || 'classic';        // template ID string
  const tokens = siteSettings.theme || {};                  // design-token overrides
  const nav = siteSettings.header || {};                    // header / navigation config
  const footer = siteSettings.footer || {};                 // footer config
  const homepage = siteSettings.homepage || {};              // hero, featured, cta
  const customCss = siteSettings.custom_css || '';           // injected CSS
  const customJs = siteSettings.custom_js || '';             // injected JS
  const seoDefaults = siteSettings.seo_defaults || {};       // meta tags

  // New expanded settings
  const socialLinks = siteSettings.social_links || {};       // facebook, instagram, etc.
  const businessInfo = siteSettings.business_info || {};     // phone, email, address, whatsapp, hours
  const announcement = siteSettings.announcement || {};      // { enabled, text, link, bg_color, text_color }
  const storePolicies = siteSettings.store_policies || {};   // about_us, return_policy, privacy_policy, terms
  const trustBadges = siteSettings.trust_badges || [];       // [{ icon, title, text }]

  // Phase 2 settings
  const currencyConfig = siteSettings.currency_config || { symbol: '৳', code: 'BDT', position: 'before', decimals: 2 };
  const storeConfig = siteSettings.store_config || {};        // maintenance, display, checkout
  const analyticsConfig = siteSettings.analytics || {};       // ga4_id, fb_pixel_id
  const popupConfig = siteSettings.popup_config || {};        // welcome popup
  const countdown = siteSettings.countdown || {};             // sale countdown

  // Currency formatting helper
  const formatPrice = (amount) => {
    const num = Number(amount) || 0;
    const { symbol = '৳', position = 'before', decimals = 2 } = currencyConfig;
    const formatted = num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return position === 'after' ? `${formatted}${symbol}` : `${symbol}${formatted}`;
  };

  // Secondary currency formatting (multi-currency display)
  const sec = currencyConfig.secondary;
  const formatSecondaryPrice = (sec?.enabled && Number(sec?.rate) > 0) ? (amount) => {
    const num = Number(amount) || 0;
    const converted = num * Number(sec.rate);
    const formatted = converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return sec.position === 'after' ? `${formatted}${sec.symbol}` : `${sec.symbol}${formatted}`;
  } : null;

  return (
    <StoreContext.Provider
      value={{ shop, settings: siteSettings, theme, tokens, nav, footer, homepage, customCss, customJs, seoDefaults, socialLinks, businessInfo, announcement, storePolicies, trustBadges, currencyConfig, storeConfig, analyticsConfig, popupConfig, countdown, formatPrice, formatSecondaryPrice, loading, error, shopSlug }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be within StoreProvider');
  return ctx;
}
