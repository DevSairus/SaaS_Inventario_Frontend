import { useEffect, useState } from 'react';
import useTenantStore from '../../store/tenantStore';
import { getProjectOptions } from '../../api/projects';

// Proyectos abiertos, compartidos entre los formularios de la sesión.
let cache = null;
const loadOptions = () => {
  if (!cache) cache = getProjectOptions().then((r) => r.data || []).catch(() => { cache = null; return []; });
  return cache;
};
export const invalidateProjectOptions = () => { cache = null; };

/**
 * Selector de proyecto para compras, gastos y ventas. No se muestra si el
 * tenant no tiene el módulo Proyectos. Vacío = documento general.
 *
 * Props: value, onChange(projectId|null, project|null), currentProject
 * ({ id, code, name } del documento que se edita, por si ya está cerrado),
 * label, hint, disabled, className.
 */
export default function ProjectSelect({ value, onChange, currentProject, label = 'Proyecto', hint, disabled = false, className = '' }) {
  const enabledModules = useTenantStore((s) => s.enabledModules);
  const enabled = enabledModules !== null && enabledModules.includes('projects');
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (enabled) loadOptions().then(setOptions);
  }, [enabled]);

  if (!enabled) return null;

  const list = currentProject && !options.some((p) => p.id === currentProject.id) ? [currentProject, ...options] : options;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <select
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null, list.find((p) => p.id === e.target.value) || null)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-sm"
      >
        <option value="">— Sin proyecto (general) —</option>
        {list.map((p) => (
          <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
        ))}
      </select>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
