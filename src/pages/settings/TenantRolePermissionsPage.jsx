import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, RotateCcw } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { getRolePermissionsMatrix, saveRolePermissions, resetRolePermissions } from '../../api/rolePermissions';
import { reloadPermissions } from '../../store/tenantPermissionsStore';

/**
 * Ajustes → Roles y permisos: qué puede hacer cada rol en esta empresa.
 * Las casillas parten de los permisos por defecto; lo cambiado se marca.
 */
export default function TenantRolePermissionsPage() {
  const [matrix, setMatrix] = useState(null);
  const [draft, setDraft] = useState({}); // 'role|key' -> bool
  const [saving, setSaving] = useState(false);

  const load = () => getRolePermissionsMatrix()
    .then((r) => { setMatrix(r.data); setDraft({}); })
    .catch((e) => toast.error(e.response?.data?.message || 'Error al cargar los permisos'));

  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const map = new Map();
    for (const p of matrix?.permissions || []) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group).push(p);
    }
    return [...map];
  }, [matrix]);

  const value = (p, role) => {
    const k = `${role}|${p.key}`;
    return k in draft ? draft[k] : p.allowed[role];
  };
  const toggle = (p, role) => {
    if (p.locked && role === 'admin') return;
    const k = `${role}|${p.key}`;
    const next = !value(p, role);
    setDraft((d) => {
      const copy = { ...d };
      if (next === p.allowed[role]) delete copy[k]; else copy[k] = next;
      return copy;
    });
  };

  const changes = Object.entries(draft).map(([k, allowed]) => {
    const [role, key] = k.split('|');
    return { role, key, allowed };
  });

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveRolePermissions(changes);
      toast.success(res.message);
      setMatrix(res.data);
      setDraft({});
      reloadPermissions();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron guardar los permisos');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('¿Volver todos los roles a los permisos por defecto? Se pierden los cambios de esta empresa.')) return;
    try {
      const res = await resetRolePermissions();
      toast.success(res.message);
      setMatrix(res.data);
      setDraft({});
      reloadPermissions();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron restablecer');
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <Link to="/users" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-1"><ArrowLeft className="w-4 h-4" /> Usuarios</Link>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Roles y permisos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Qué puede hacer cada rol en tu empresa. Los cambios aplican a todos los usuarios de ese rol en menos de un minuto.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
              <RotateCcw className="w-4 h-4" /> Restablecer
            </button>
            <button onClick={save} disabled={saving || !changes.length} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
              {saving ? 'Guardando...' : changes.length ? `Guardar ${changes.length} cambio(s)` : 'Sin cambios'}
            </button>
          </div>
        </div>

        {!matrix ? (
          <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[280px]">Permiso</th>
                  {matrix.roles.map((r) => (
                    <th key={r.key} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {groups.map(([group, perms]) => (
                  <Fragment key={group}>
                    <tr className="bg-gray-50/60 dark:bg-gray-900/20">
                      <td colSpan={matrix.roles.length + 1} className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{group}</td>
                    </tr>
                    {perms.map((p) => (
                      <tr key={p.key}>
                        <td className="px-4 py-2.5">
                          <p className="text-gray-900 dark:text-gray-100">{p.label}</p>
                          {p.hint && <p className="text-xs text-gray-500">{p.hint}</p>}
                        </td>
                        {matrix.roles.map((r) => {
                          const locked = p.locked && r.key === 'admin';
                          const changedNow = `${r.key}|${p.key}` in draft;
                          const customized = !changedNow && p.customized.includes(r.key);
                          return (
                            <td key={r.key} className={`px-2 py-2.5 text-center ${changedNow ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}>
                              {locked ? (
                                <Lock className="w-4 h-4 mx-auto text-gray-400" title="Siempre activo para el administrador" />
                              ) : (
                                <label className="inline-flex items-center justify-center cursor-pointer" title={customized ? 'Cambiado frente al valor por defecto' : ''}>
                                  <input type="checkbox" checked={value(p, r.key)} onChange={() => toggle(p, r.key)} className="w-4 h-4 accent-orange-600" />
                                  {customized && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-orange-500" />}
                                </label>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-500">
          El punto naranja indica un permiso cambiado frente al valor por defecto. Las acciones que no aparecen aquí siguen gobernadas por el rol del usuario.
        </p>
      </div>
    </Layout>
  );
}
