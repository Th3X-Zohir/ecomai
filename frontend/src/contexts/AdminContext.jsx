import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { shops, setSelectedShopId, getSelectedShopId } from '../api';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [shopList, setShopList] = useState([]);
  const [selectedShop, setSelectedShop] = useState(getSelectedShopId());
  const [loadingShops, setLoadingShops] = useState(false);

  // Load all shops for super_admin
  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingShops(true);
      shops.list({ limit: 200 })
        .then((data) => {
          setShopList(data.items || []);
          // Auto-select first shop if none selected
          if (!selectedShop && data.items?.length > 0) {
            const firstId = data.items[0].id;
            setSelectedShop(firstId);
            setSelectedShopId(firstId);
          }
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
