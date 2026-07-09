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
  fetchBranches: async () => {
    set({ loading: true });
    try {
      const response = await branchesService.getAll();
      const branches = response.data || [];
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
