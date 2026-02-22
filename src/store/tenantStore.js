// frontend/src/store/tenantStore.js
import { create } from 'zustand';
import axios from '../api/axios';

const useTenantStore = create((set, get) => ({
  features: null,  // null = todavía no cargado
  loading: false,

  fetchFeatures: async () => {
    // Si ya está cargando, no lanzar otra petición
    if (get().loading) return;
    // Si ya cargó, no volver a hacer fetch (a menos que se llame refresh)
    if (get().features !== null) return;

    set({ loading: true });
    try {
      const res = await axios.get('/tenant/config');
      if (res.data.success) {
        const rawFeatures = res.data.data.features || {};
        // Aplicar defaults: hide_remision_tax es true si nunca se configuró
        const features = {
          hide_remision_tax: true,
          ...rawFeatures,
        };
        set({ features, loading: false });
      }
    } catch {
      // En caso de error, usar defaults
      set({ features: { hide_remision_tax: true }, loading: false });
    }
  },

  // Llamar desde TenantSettingsPage después de guardar para reflejar cambios inmediatamente
  setFeatures: (rawFeatures) => {
    const features = {
      hide_remision_tax: true,
      ...rawFeatures,
    };
    set({ features });
  },
}));

export default useTenantStore;