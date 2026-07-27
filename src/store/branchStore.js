import { create } from 'zustand';
import { branchesService } from '../api/branches';
import { getStoredBranchId, setStoredBranchId } from '../utils/authStorage';

const useBranchStore = create((set, get) => ({
  branches: [],
  activeBranchId: getStoredBranchId(),
  loading: false,
  loaded: false,

  // Carga las sedes del tenant. Si la sede activa guardada ya no existe
  // o está inactiva, la reemplaza por la principal (o la primera disponible).
  //
  // El endpoint /branches devuelve TODAS las sedes (incluso inactivas) para
  // roles admin/super_admin, porque BranchesPage las necesita para poder
  // reactivarlas. Este store alimenta el selector de sede operativo (arriba
  // en el layout), así que aquí SIEMPRE filtramos las inactivas: no tiene
  // sentido ofrecer para seleccionar una sede en la que el middleware va a
  // rechazar cualquier request de todas formas.
  fetchBranches: async () => {
    set({ loading: true });
    try {
      const response = await branchesService.getAll();
      const branches = (response.data || []).filter(b => b.is_active !== false);
      set({ branches, loading: true, loaded: true });

      const current = get().activeBranchId;
      const stillValid = current && branches.some(b => b.id === current);

      if (!stillValid) {
        const preferred = branches.find(b => b.is_main) || branches[0] || null;
        if (preferred) {
          get().setActiveBranch(preferred.id);
        }
      }
      set({ loading: false });
      return branches;
    } catch (e) {
      set({ loading: false, loaded: true });
      return [];
    }
  },

  setActiveBranch: (branchId) => {
    setStoredBranchId(branchId);
    set({ activeBranchId: branchId });
  },

  clearBranch: () => {
    setStoredBranchId(null);
    set({ activeBranchId: null, branches: [], loaded: false });
  },
}));

export default useBranchStore;