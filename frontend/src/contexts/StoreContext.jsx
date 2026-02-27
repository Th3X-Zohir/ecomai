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

  return (
    <StoreContext.Provider
      value={{ shop, settings: siteSettings, theme, tokens, nav, footer, homepage, customCss, customJs, seoDefaults, loading, error, shopSlug }}
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
