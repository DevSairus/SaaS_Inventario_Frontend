import React, { useState, useEffect } from 'react';
import { Link2, Plus, Save, X } from 'lucide-react';
import api from '@api/axios';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Loading from '@components/common/Loading';
import toast from 'react-hot-toast';

const ESTADOS = [
  { value: 'activo', label: 'Activo', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'suspendido', label: 'Suspendido', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'revocado', label: 'Revocado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
];

function EstadoBadge({ estado }) {
  const e = ESTADOS.find((x) => x.value === estado) || ESTADOS[0];
  return <span className={`px-2 py-0.5 rounded-full text-xs ${e.cls}`}>{e.label}</span>;
}

/**
 * El tenant_id es justo el dato que del lado Ensambladora hay que pegar
 * como `tenant_id_externo` al crear el CSA/PDV -- sin poder copiarlo de
 * acá, no hay forma de arrancar la conexión sin ir a mirar la base de datos.
 */
function CampoCopiable({ valor }) {
  const [copiado, setCopiado] = useState(false);
  if (!valor) return <span className="text-gray-400 dark:text-gray-500">—</span>;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(valor);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
      title={valor}
      className="font-mono text-xs text-gray-500 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400"
    >
      {copiado ? 'Copiado ✓' : `${valor.slice(0, 8)}… copiar`}
    </button>
  );
}

const FORM_INICIAL = { tenant_id: '', api_key: '', hmac_secret: '', csa_pdv_id_externo: '', activar_modulo: true };

const SuperAdminEnsambladoraConfig = () => {
  const [loading, setLoading] = useState(true);
  const [conexiones, setConexiones] = useState([]);
  const [tenants, setTenants] = useState([]);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ api_key: '', hmac_secret: '', csa_pdv_id_externo: '', estado: 'activo', activar_modulo: true });
  const [procesandoId, setProcesandoId] = useState(null);

  useEffect(() => {
    cargar();
    cargarTenants();
  }, []);

  async function cargar() {
    try {
      setLoading(true);
      const { data } = await api.get('/superadmin/ensambladora-config');
      setConexiones(data.data || []);
    } catch {
      toast.error('Error al cargar las conexiones con Ensambladora');
    } finally {
      setLoading(false);
    }
  }

  async function cargarTenants() {
    try {
      const { data } = await api.get('/superadmin/ensambladora-config/tenants-disponibles');
      setTenants(data.tenants || []);
    } catch {
      toast.error('Error al cargar el listado de tenants');
    }
  }

  const tenantsConectadosIds = new Set(conexiones.map((c) => c.tenant_id));
  const tenantsParaConectar = tenants.filter((t) => !tenantsConectadosIds.has(t.id));

  async function handleCrear(e) {
    e.preventDefault();
    if (!form.tenant_id || !form.api_key.trim() || !form.hmac_secret.trim()) {
      toast.error('Tenant, api_key y hmac_secret son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      await api.post('/superadmin/ensambladora-config', {
        tenant_id: form.tenant_id,
        api_key: form.api_key.trim(),
        hmac_secret: form.hmac_secret.trim(),
        csa_pdv_id_externo: form.csa_pdv_id_externo.trim() || null,
        activar_modulo: form.activar_modulo,
      });
      toast.success('Conexión guardada correctamente');
      setForm(FORM_INICIAL);
      setMostrarForm(false);
      cargar();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar la conexión');
    } finally {
      setGuardando(false);
    }
  }

  function abrirEdicion(c) {
    setEditId(c.tenant_id);
    setEditForm({ api_key: '', hmac_secret: '', csa_pdv_id_externo: c.csa_pdv_id_externo || '', estado: c.estado, activar_modulo: c.modulo_activo });
  }

  async function guardarEdicion(tenantId) {
    setProcesandoId(tenantId);
    try {
      const payload = {
        csa_pdv_id_externo: editForm.csa_pdv_id_externo.trim() || null,
        estado: editForm.estado,
        activar_modulo: editForm.activar_modulo,
      };
      if (editForm.api_key.trim()) payload.api_key = editForm.api_key.trim();
      if (editForm.hmac_secret.trim()) payload.hmac_secret = editForm.hmac_secret.trim();

      await api.patch(`/superadmin/ensambladora-config/${tenantId}`, payload);
      toast.success('Conexión actualizada');
      setEditId(null);
      cargar();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al actualizar la conexión');
    } finally {
      setProcesandoId(null);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Link2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Conexión con Ensambladora</h1>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Credenciales de sincronización por tenant (api_key/hmac_secret) frente al Core Ensambladora. El par se
              genera del lado del Core (panel superadmin de esa app) y se pega acá -- este panel nunca los genera.
            </p>
          </div>
        </div>
        <Button onClick={() => setMostrarForm((v) => !v)} icon={mostrarForm ? X : Plus}>
          {mostrarForm ? 'Cancelar' : 'Conectar tenant'}
        </Button>
      </div>

      {mostrarForm && (
        <Card>
          <form onSubmit={handleCrear} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Tenant</label>
              <select
                required
                value={form.tenant_id}
                onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
              >
                <option value="">Selecciona un tenant</option>
                {tenantsParaConectar.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.business_name || t.company_name}
                  </option>
                ))}
              </select>
              {form.tenant_id && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  tenant_id (pasáselo a quien crea el CSA/PDV en Ensambladora):{' '}
                  <CampoCopiable valor={form.tenant_id} />
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">csa_pdv_id (Core Ensambladora)</label>
              <input
                type="text"
                value={form.csa_pdv_id_externo}
                onChange={(e) => setForm({ ...form, csa_pdv_id_externo: e.target.value })}
                placeholder="Opcional -- id del csa_pdv allá"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">api_key</label>
              <input
                required
                type="text"
                value={form.api_key}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                placeholder="csa_xxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">hmac_secret</label>
              <input
                required
                type="text"
                value={form.hmac_secret}
                onChange={(e) => setForm({ ...form, hmac_secret: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
              />
            </div>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.activar_modulo}
                onChange={(e) => setForm({ ...form, activar_modulo: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-white/10"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Activar el módulo "Ensambladora" para este tenant al guardar</span>
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={guardando} icon={Save}>
                {guardando ? 'Guardando...' : 'Guardar conexión'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 dark:text-gray-500 dark:border-white/10">
                <th className="py-2 pr-4">Tenant</th>
                <th className="py-2 pr-4">tenant_id</th>
                <th className="py-2 pr-4">csa_pdv_id</th>
                <th className="py-2 pr-4">api_key</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Módulo</th>
                <th className="py-2 pr-4">Actualizado</th>
                <th className="py-2 pr-4"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {conexiones.map((c) => (
                <React.Fragment key={c.id}>
                  <tr>
                    <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">{c.tenant?.business_name || c.tenant?.company_name || '—'}</td>
                    <td className="py-2 pr-4">
                      <CampoCopiable valor={c.tenant_id} />
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-500 dark:text-gray-500">{c.csa_pdv_id_externo || '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-500 dark:text-gray-500">•••• {c.api_key_sufijo}</td>
                    <td className="py-2 pr-4"><EstadoBadge estado={c.estado} /></td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${c.modulo_activo ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-graphite-2 dark:text-gray-500'}`}>
                        {c.modulo_activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500 dark:text-gray-500">{new Date(c.actualizado_en).toLocaleString('es-CO')}</td>
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => (editId === c.tenant_id ? setEditId(null) : abrirEdicion(c))}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        {editId === c.tenant_id ? 'Cerrar' : 'Editar'}
                      </button>
                    </td>
                  </tr>
                  {editId === c.tenant_id && (
                    <tr>
                      <td colSpan={8} className="py-4 pr-4 bg-gray-50 dark:bg-graphite-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">csa_pdv_id (Core Ensambladora)</label>
                            <input
                              type="text"
                              value={editForm.csa_pdv_id_externo}
                              onChange={(e) => setEditForm({ ...editForm, csa_pdv_id_externo: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded font-mono dark:bg-graphite-3 dark:border-white/10 dark:text-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Estado</label>
                            <select
                              value={editForm.estado}
                              onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded dark:bg-graphite-3 dark:border-white/10 dark:text-gray-100"
                            >
                              {ESTADOS.map((e) => (
                                <option key={e.value} value={e.value}>{e.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">
                              api_key nuevo <span className="text-gray-400">(solo si rotó del lado Core)</span>
                            </label>
                            <input
                              type="text"
                              value={editForm.api_key}
                              onChange={(e) => setEditForm({ ...editForm, api_key: e.target.value })}
                              placeholder="Dejar en blanco para no cambiar"
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded font-mono dark:bg-graphite-3 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">hmac_secret nuevo</label>
                            <input
                              type="text"
                              value={editForm.hmac_secret}
                              onChange={(e) => setEditForm({ ...editForm, hmac_secret: e.target.value })}
                              placeholder="Dejar en blanco para no cambiar"
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded font-mono dark:bg-graphite-3 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
                            />
                          </div>
                          <label className="flex items-center gap-2 sm:col-span-2">
                            <input
                              type="checkbox"
                              checked={editForm.activar_modulo}
                              onChange={(e) => setEditForm({ ...editForm, activar_modulo: e.target.checked })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-white/10"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">Módulo "Ensambladora" activo para este tenant</span>
                          </label>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            onClick={() => guardarEdicion(c.tenant_id)}
                            disabled={procesandoId === c.tenant_id}
                            className="px-3 py-1.5 text-xs"
                          >
                            {procesandoId === c.tenant_id ? 'Guardando...' : 'Guardar cambios'}
                          </Button>
                          <Button variant="secondary" onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs">
                            Cancelar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {conexiones.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-400 dark:text-gray-500">
                    Ningún tenant conectado con Ensambladora todavía
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SuperAdminEnsambladoraConfig;
