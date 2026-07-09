// frontend/src/store/tenantStore.js
import { create } from 'zustand';
import axios from '../api/axios';

const useTenantStore = create((set, get) => ({
  features: null,  // null = todavía no cargado
  enabledModules: null, // null = todavía no cargado; array de module keys una vez cargado
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
          vehicle_field_enabled: true,
          technician_field_enabled: false, // default: deshabilitado (igual que placa)
          ...rawFeatures,
        };
        set({ features, enabledModules: res.data.data.effective_modules || [], loading: false });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[tenantStore] fetchFeatures fallo, usando defaults:', error);
      }
      // En caso de error, usar defaults para no romper la UI.
      // enabledModules queda null (no [] ) para no ocultarle todo el menú a un
      // usuario válido por un simple error de red — TenantRoute/Sidebar tratan
      // null como "todavía no se sabe, no bloquear todavía".
      set({ features: { hide_remision_tax: true }, loading: false });
    }
  },

  // Llamar desde TenantSettingsPage después de guardar para reflejar cambios inmediatamente
  setFeatures: (rawFeatures) => {
    const features = {
      hide_remision_tax: true,
      vehicle_field_enabled: true,
      technician_field_enabled: false,
      ...rawFeatures,
    };
    set({ features });
  },
}));

export default useTenantStore;