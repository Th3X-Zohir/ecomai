import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { shops, setSelectedShopId, getSelectedShopId } from '../api';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [shopList, setShopList] = useState([]);
  // Super admin defaults to ALL shops (null) — not scoped to any single shop
  const [selectedShop, setSelectedShop] = useState(isSuperAdmin ? null : getSelectedShopId());
  const [loadingShops, setLoadingShops] = useState(false);

  // Load all shops for super_admin
  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingShops(true);
      // Clear any stale shop selection from localStorage for super admin
      setSelectedShop(null);
      setSelectedShopId(null);
      shops.list({ limit: 200 })
        .then((data) => {
          setShopList(data.items || []);
        })
        .catch(() => {})
        .finally(() => setLoadingShops(false));
    }
  }, [isSuperAdmin]);

  const selectShop = useCallback((shopId) => {
    setSelectedShop(shopId);
    setSelectedShopId(shopId);
  }, []);

  const currentShop = shopList.find(s => s.id === selectedShop) || null;

  return (
    <AdminContext.Provider value={{
      isSuperAdmin,
      shopList,
      selectedShop,
      currentShop,
      selectShop,
      loadingShops,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
