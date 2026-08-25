// frontend/src/store/tenantStore.js
import { create } from 'zustand';
import axios from '../api/axios';

const useTenantStore = create((set, get) => ({
  features: null,  // null = todavía no cargado
  enabledModules: null, // null = todavía no cargado; array de module keys una vez cargado
  tenantSlug: null, // usado para armar links públicos, ej. /agendar/:slug
  taxConfig: null, // null = todavía no cargado; incluye ica_categories (Fase D)
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
        // Aplicar defaults: hide_remision_tax (Ventas) y hide_workorder_tax
        // (Taller) son independientes, cada una true si nunca se configuró.
        const features = {
          hide_remision_tax: true,
          hide_workorder_tax: true,
          vehicle_field_enabled: true,
          technician_field_enabled: false, // default: deshabilitado (igual que placa)
          ...rawFeatures,
        };
        set({
          features,
          enabledModules: res.data.data.effective_modules || [],
          tenantSlug: res.data.data.slug || null,
          taxConfig: res.data.data.tax_config || {},
          loading: false,
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[tenantStore] fetchFeatures fallo, usando defaults:', error);
      }
      // En caso de error, usar defaults para no romper la UI.
      // enabledModules queda null (no [] ) para no ocultarle todo el menú a un
      // usuario válido por un simple error de red — TenantRoute/Sidebar tratan
      // null como "todavía no se sabe, no bloquear todavía".
      set({ features: { hide_remision_tax: true, hide_workorder_tax: true }, loading: false });
    }
  },

  // Llamar desde TenantSettingsPage después de guardar para reflejar cambios inmediatamente
  setFeatures: (rawFeatures) => {
    const features = {
      hide_remision_tax: true,
      hide_workorder_tax: true,
      vehicle_field_enabled: true,
      technician_field_enabled: false,
      ...rawFeatures,
    };
    set({ features });
  },

  // Llamar desde TenantSettingsPage después de guardar tax_config, para que
  // ProductFormModal vea de inmediato tarifas ICA actualizadas (Fase D)
  setTaxConfig: (taxConfig) => set({ taxConfig: taxConfig || {} }),

  // Llamar al cerrar sesión para no arrastrar los módulos del tenant anterior
  // a la siguiente sesión (por ejemplo si otro usuario inicia sesión en el mismo navegador).
  reset: () => set({ features: null, enabledModules: null, tenantSlug: null, taxConfig: null, loading: false }),
}));

export default useTenantStore;