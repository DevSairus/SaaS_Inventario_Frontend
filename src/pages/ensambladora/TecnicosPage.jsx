import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Users, Loader2, RefreshCw, UserPlus, UserMinus, ShieldCheck, ShieldQuestion, X } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraTecnicosApi } from '../../api/ensambladora';
import { usersAPI } from '../../api/users';
import Combobox from '../../components/common/Combobox';

const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100';

const ROL_LABEL = { tecnico: 'Técnico', asesor: 'Asesor' };

const nombreCompleto = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;

// sync_estado del registro local (ver models/ensambladora/EnsambladoraTecnicoAsesor.js):
// pendiente | enviado | confirmado | error
const SYNC_CONFIG = {
  pendiente:  { label: 'Pendiente de sync',  cls: 'text-gray-500' },
  enviado:    { label: 'Enviado',            cls: 'text-blue-600' },
  confirmado: { label: 'Sincronizado',       cls: 'text-green-600' },
  error:      { label: 'Error de sync',      cls: 'text-red-600' },
};

const emptyForm = { usuario: null, cedula: '', rol: 'tecnico' };

// Fase 7 — "gestión local de usuarios con sincronización a la Ensambladora":
// registro liviano y propio del módulo (ensambladora_tecnicos_asesores), a
// propósito separado de la tabla `users` real de Pitbox (ver LEEME de la
// fase 7 en el backend) -- vincular acá emite usuario.tecnico_asesor_vinculado
// hacia el Core, para que el técnico sea reconocible en cualquier CSA.
export default function TecnicosPage() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [desvinculandoDoc, setDesvinculandoDoc] = useState(null);
  const [verificandoDoc, setVerificandoDoc] = useState(null);
  const [verificacion, setVerificacion] = useState(null); // { documento, data } del último verificado

  const load = useCallback(async ({ silent = false } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await ensambladoraTecnicosApi.list();
      setRegistros(res.data?.data ?? []);
    } catch (err) {
      toast.error('No se pudo cargar el listado de técnicos/asesores');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    usersAPI.getAll({ is_active: 'true', limit: 200 })
      .then((res) => setUsuarios(res.data?.users ?? []))
      .catch(() => toast.error('No se pudo cargar el listado de usuarios de Pitbox'));
  }, []);

  const setF = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSeleccionarUsuario = (usuario) => setForm((p) => ({ ...p, usuario, cedula: usuario.cedula || '' }));
  const handleLimpiarUsuario = () => setForm((p) => ({ ...p, usuario: null, cedula: '' }));

  const handleVincular = async (e) => {
    e.preventDefault();
    if (!form.usuario || !form.cedula.trim() || !form.rol) {
      toast.error('Selecciona un usuario, completa la cédula y elige un rol');
      return;
    }
    setSaving(true);
    try {
      // Si el usuario todavía no tenía cédula cargada en su perfil, se
      // guarda ahora para no tener que volver a pedirla la próxima vez.
      if (!form.usuario.cedula) {
        await usersAPI.update(form.usuario.id, { cedula: form.cedula.trim() });
      }
      await ensambladoraTecnicosApi.vincular({
        documento_identidad: form.cedula.trim(),
        nombre: nombreCompleto(form.usuario),
        rol: form.rol,
      });
      toast.success('Técnico/asesor vinculado');
      setForm(emptyForm);
      setShowForm(false);
      await load({ silent: true });
    } catch (err) {
      // Igual que en el backend: aunque falle la confirmación con el Core,
      // el registro local sí quedó creado (sync_estado: 'error') -- se
      // avisa pero se refresca la lista de todas formas.
      const msg = err.response?.data?.message || 'No se pudo vincular';
      toast.error(msg);
      setForm(emptyForm);
      setShowForm(false);
      await load({ silent: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDesvincular = async (documento) => {
    setDesvinculandoDoc(documento);
    try {
      await ensambladoraTecnicosApi.desvincular(documento);
      toast.success('Desvinculado');
      await load({ silent: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'No se pudo confirmar la desvinculación';
      toast.error(msg);
    } finally {
      setDesvinculandoDoc(null);
    }
  };

  const handleVerificar = async (documento) => {
    setVerificandoDoc(documento);
    setVerificacion(null);
    try {
      const res = await ensambladoraTecnicosApi.verificar(documento);
      setVerificacion({ documento, data: res.data?.data ?? null });
    } catch (err) {
      toast.error('No se pudo verificar contra la Ensambladora');
    } finally {
      setVerificandoDoc(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Técnicos y asesores</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load({ silent: true })}
              disabled={refreshing}
              title="Actualizar"
              className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:text-primary-600 disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"
            >
              {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {showForm ? 'Cancelar' : 'Vincular'}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Registro local de técnicos y asesores de este centro, sincronizado con la Ensambladora.
        </p>

        {showForm && (
          <form onSubmit={handleVincular} className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-3 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Usuario *</label>
              <Combobox
                placeholder="Buscar por nombre o email..."
                items={usuarios}
                value={form.usuario?.id || null}
                displayValue={form.usuario ? nombreCompleto(form.usuario) : ''}
                onSelect={handleSeleccionarUsuario}
                onClear={handleLimpiarUsuario}
                filterFn={(u, q) => nombreCompleto(u).toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())}
                renderItem={(u) => (
                  <div>
                    <p className="text-gray-700 dark:text-gray-200">{nombreCompleto(u)}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                )}
              />
            </div>
            {form.usuario && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cédula *</label>
                <input
                  type="text"
                  required
                  value={form.cedula}
                  onChange={(e) => setF('cedula', e.target.value)}
                  disabled={!!form.usuario.cedula}
                  className={`${inputCls} ${form.usuario.cedula ? 'opacity-60' : ''}`}
                  placeholder="Documento de identidad"
                />
                {!form.usuario.cedula && (
                  <p className="text-xs text-gray-400 mt-1">Este usuario no tiene cédula cargada — se guardará en su perfil.</p>
                )}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rol *</label>
              <select value={form.rol} onChange={(e) => setF('rol', e.target.value)} className={inputCls}>
                <option value="tecnico">Técnico</option>
                <option value="asesor">Asesor</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar vinculación
            </button>
          </form>
        )}

        {verificacion && (
          <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 rounded-lg px-3 py-2.5 mb-5 text-sm text-blue-700 dark:text-blue-300">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-mono text-xs text-blue-500">{verificacion.documento}</p>
              {verificacion.data ? (
                <p>
                  Reconocido en la red — {verificacion.data.nombre || 'sin nombre'} ({ROL_LABEL[verificacion.data.rol] || verificacion.data.rol}), estado: {verificacion.data.estado}
                </p>
              ) : (
                <p>No está registrado en la Ensambladora todavía.</p>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {!loading && registros.length === 0 && (
          <div className="text-center py-16 border border-dashed border-gray-300 dark:border-white/10 rounded-xl">
            <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Todavía no hay técnicos/asesores vinculados
            </p>
          </div>
        )}

        {!loading && registros.length > 0 && (
          <ul className="space-y-2">
            {registros.map((r) => {
              const syncCfg = SYNC_CONFIG[r.sync_estado];
              return (
                <li
                  key={r.id}
                  className={`flex items-center justify-between gap-3 bg-white dark:bg-graphite-2 border rounded-xl px-4 py-3 ${
                    r.vinculado ? 'border-gray-200 dark:border-white/10' : 'border-gray-100 dark:border-white/5 opacity-60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {r.nombre || <span className="text-gray-400 italic">Sin nombre</span>}
                      <span className="text-xs font-normal text-gray-400 ml-1.5">({ROL_LABEL[r.rol] || r.rol})</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{r.documento_identidad}</p>
                    <p className={`text-xs mt-0.5 ${syncCfg?.cls || 'text-gray-400'}`}>
                      {syncCfg?.label || r.sync_estado}
                      {!r.vinculado ? ' · desvinculado' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleVerificar(r.documento_identidad)}
                      disabled={verificandoDoc === r.documento_identidad}
                      title="Verificar contra la Ensambladora"
                      className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:text-blue-600 disabled:opacity-40"
                    >
                      {verificandoDoc === r.documento_identidad ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldQuestion className="w-4 h-4" />
                      )}
                    </button>
                    {r.vinculado && (
                      <button
                        onClick={() => handleDesvincular(r.documento_identidad)}
                        disabled={desvinculandoDoc === r.documento_identidad}
                        title="Desvincular"
                        className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:text-red-600 disabled:opacity-40"
                      >
                        {desvinculandoDoc === r.documento_identidad ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Layout>
  );
}
