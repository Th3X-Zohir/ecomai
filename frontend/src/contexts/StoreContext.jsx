import { createContext, useContext, useState, useEffect } from 'react';
import { storeApi } from '../api-public';

const StoreContext = createContext(null);

export function StoreProvider({ shopSlug, children }) {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    storeApi
      .getShop(shopSlug)
      .then(setShop)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [shopSlug]);

  const settings = shop?.settings || {};
  const theme = settings.theme_name || 'classic';
  const tokens = settings.design_tokens || {};
  const layout = settings.layout_config || {};
  const nav = settings.navigation_config || {};
  const homepage = settings.homepage_config || {};
  const customCss = settings.custom_css || '';

  return (
    <StoreContext.Provider
      value={{ shop, settings, theme, tokens, layout, nav, homepage, customCss, loading, error, shopSlug }}
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
