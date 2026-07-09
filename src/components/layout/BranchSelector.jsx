import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import useBranchStore from '../../store/branchStore';
import { ROLES } from '../../utils/constants';

const BuildingIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M3 21h18" />
    <path d="M5 21V6a1 1 0 011-1h5a1 1 0 011 1v15" />
    <path d="M14 21V10a1 1 0 011-1h4a1 1 0 011 1v11" />
    <path d="M8 8h.01M8 11h.01M8 14h.01M8 17h.01" />
  </svg>
);

const ChevronIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default function BranchSelector() {
  const { user } = useAuthStore();
  const { branches, activeBranchId, loaded, fetchBranches, setActiveBranch } = useBranchStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (user && user.role !== ROLES.SUPER_ADMIN && !loaded) {
      fetchBranches();
    }
  }, [user, loaded, fetchBranches]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user || user.role === ROLES.SUPER_ADMIN) return null;
  // Con una sola sede (o ninguna cargada aún) no tiene sentido mostrar el selector
  if (branches.length <= 1) return null;

  const activeBranch = branches.find(b => b.id === activeBranchId);

  const handleSelect = (branch) => {
    setOpen(false);
    if (branch.id === activeBranchId) return;
    setActiveBranch(branch.id);
    toast.success(`Sede activa: ${branch.name}`);
    // Recarga para que todos los listados/formularios tomen la nueva sede activa
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors shadow-sm"
      >
        <BuildingIcon className="w-4 h-4 text-gray-500" />
        <span className="max-w-[140px] truncate">{activeBranch?.name || 'Selecciona sede'}</span>
        <ChevronIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sedes</p>
          {branches.map(branch => (
            <button
              key={branch.id}
              onClick={() => handleSelect(branch)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                branch.id === activeBranchId ? 'text-pink-700 bg-pink-50 font-semibold' : 'text-gray-700'
              }`}
            >
              <span className="truncate">
                {branch.name}
                {branch.is_main && <span className="ml-1.5 text-xs text-gray-400 font-normal">(Principal)</span>}
              </span>
              {branch.id === activeBranchId && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
