import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/common/Modal';
import NumericInput from '../../components/inputs/NumericInput';
import { getApprovalRules, createApprovalRule, updateApprovalRule, deleteApprovalRule } from '../../api/approvals';
import { getProjectOptions } from '../../api/projects';
import { usersAPI } from '../../api/users';
import useTenantStore from '../../store/tenantStore';
import { formatCurrency } from '../../utils/formatters';

const ROLES = {
  admin: 'Administrador', manager: 'Gerente', accountant: 'Contador', seller: 'Vendedor',
  warehouse_keeper: 'Bodeguero', inventory_lead: 'Líder de inventarios', technician: 'Técnico', user: 'Usuario', viewer: 'Visualizador',
};
const empty = { name: '', min_amount: '', max_amount: '', approver_type: 'role', approver_role: 'manager', approver_user_id: '', project_id: '', sequence: 1, is_active: true };
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800';
const userName = (u) => (u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : '');

/**
 * Ajustes → Reglas de aprobación de órdenes de compra. Sin reglas, las
 * compras se confirman como siempre.
 */
export default function ApprovalRulesPage() {
  const hasProjects = (useTenantStore((s) => s.enabledModules) || []).includes('projects');
  const [rules, setRules] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(null); // null = cerrado
  const [saving, setSaving] = useState(false);

  const load = () => getApprovalRules().then((r) => setRules(r.data || [])).catch((e) => toast.error(e.response?.data?.message || 'Error al cargar las reglas'));
  useEffect(() => {
    load();
    usersAPI.getAll({ limit: 200, is_active: true, has_system_access: true }).then((r) => setUsers(r.data?.users || [])).catch(() => {});
    if (hasProjects) getProjectOptions().then((r) => setProjects(r.data || [])).catch(() => {});
  }, [hasProjects]);

  const open = (rule) => setForm(rule ? {
    ...empty, ...rule,
    min_amount: rule.min_amount ?? '', max_amount: rule.max_amount ?? '',
    approver_type: rule.approver_user_id ? 'user' : 'role', approver_role: rule.approver_role || 'manager',
    approver_user_id: rule.approver_user_id || '', project_id: rule.project_id || '',
  } : { ...empty });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        min_amount: Number(form.min_amount) || 0,
        max_amount: form.max_amount === '' ? null : Number(form.max_amount),
        approver_role: form.approver_type === 'role' ? form.approver_role : null,
        approver_user_id: form.approver_type === 'user' ? form.approver_user_id || null : null,
        project_id: form.project_id || null,
        sequence: Number(form.sequence) || 1,
        is_active: form.is_active,
      };
      const res = form.id ? await updateApprovalRule(form.id, payload) : await createApprovalRule(payload);
      toast.success(res.message);
      setForm(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar la regla');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (rule) => {
    if (!window.confirm(`¿Eliminar la regla "${rule.name}"? Las solicitudes ya creadas siguen su curso.`)) return;
    try {
      await deleteApprovalRule(rule.id);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar');
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <Link to="/approvals" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-1"><ArrowLeft className="w-4 h-4" /> Aprobaciones</Link>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Reglas de aprobación</h1>
            <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
              Una orden de compra cuyo total cae en el rango de una regla no se puede confirmar ni recibir hasta que la apruebe quien diga la regla.
              Si aplican varias reglas, se aprueban en orden de paso. Quien pide la aprobación nunca puede aprobarla.
            </p>
          </div>
          <button onClick={() => open(null)} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            <Plus className="w-4 h-4" /> Nueva regla
          </button>
        </div>

        {!rules ? (
          <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>
        ) : rules.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-500">
            <p>Sin reglas: las órdenes de compra se confirman sin aprobación.</p>
            <p className="text-sm mt-1">Ejemplo: "Compras desde $5.000.000 las aprueba Gerencia".</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-2">Paso</th><th className="px-4 py-2">Regla</th><th className="px-4 py-2">Rango del total</th>
                  <th className="px-4 py-2">Aprueba</th>{hasProjects && <th className="px-4 py-2">Proyecto</th>}<th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rules.map((r) => (
                  <tr key={r.id} className={r.is_active ? '' : 'opacity-50'}>
                    <td className="px-4 py-2">{r.sequence}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{r.name}{!r.is_active && ' (inactiva)'}</td>
                    <td className="px-4 py-2 tabular-nums">{formatCurrency(r.min_amount)} {r.max_amount ? `a ${formatCurrency(r.max_amount)}` : 'en adelante'}</td>
                    <td className="px-4 py-2">{r.approver ? userName(r.approver) : ROLES[r.approver_role] || r.approver_role}</td>
                    {hasProjects && <td className="px-4 py-2">{r.project ? `${r.project.code}` : 'Todos'}</td>}
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => open(r)} className="text-gray-400 hover:text-orange-600 mr-3" title="Editar"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(r)} className="text-gray-400 hover:text-red-600" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar regla' : 'Nueva regla de aprobación'} size="md">
        {form && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input value={form.name} onChange={set('name')} className={inputCls} placeholder="Ej. Compras desde $5 millones" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Total desde</label>
                <NumericInput value={form.min_amount} onChange={set('min_amount')} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hasta (vacío = sin tope)</label>
                <NumericInput value={form.max_amount} onChange={set('max_amount')} className={inputCls} placeholder="Sin tope" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Aprueba</label>
              <div className="flex gap-4 text-sm mb-2">
                <label className="flex items-center gap-1.5"><input type="radio" checked={form.approver_type === 'role'} onChange={() => setForm((f) => ({ ...f, approver_type: 'role' }))} /> Cualquier usuario con el rol</label>
                <label className="flex items-center gap-1.5"><input type="radio" checked={form.approver_type === 'user'} onChange={() => setForm((f) => ({ ...f, approver_type: 'user' }))} /> Un usuario específico</label>
              </div>
              {form.approver_type === 'role' ? (
                <select value={form.approver_role} onChange={set('approver_role')} className={inputCls}>
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : (
                <select value={form.approver_user_id} onChange={set('approver_user_id')} className={inputCls}>
                  <option value="">Elige un usuario...</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{userName(u)} · {ROLES[u.role] || u.role}</option>)}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Paso</label>
                <input type="number" min="1" value={form.sequence} onChange={set('sequence')} className={inputCls} />
                <p className="text-xs text-gray-500 mt-1">Si aplican varias reglas, se aprueban de menor a mayor paso.</p>
              </div>
              {hasProjects && (
                <div>
                  <label className="block text-sm font-medium mb-1">Proyecto</label>
                  <select value={form.project_id} onChange={set('project_id')} className={inputCls}>
                    <option value="">Todas las compras</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Regla activa</label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setForm(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
