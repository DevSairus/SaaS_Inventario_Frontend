import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Undo2,
  Trash2,
  Clock,
} from 'lucide-react';
import api from '@api/axios';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Loading from '@components/common/Loading';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  migrado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  legado: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const TenantMigrationStatus = () => {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [actionSlug, setActionSlug] = useState(null); // slug con una acción en curso, para deshabilitar sus botones
  const [cleanupReport, setCleanupReport] = useState(null); // { slug, execute, report }

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/superadmin/tenants/migration-status');
      setTenants(data.tenants || []);
    } catch (error) {
      toast.error('Error al cargar el estado de migración de tenants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleCutover = async (slug) => {
    setActionSlug(slug);
    try {
      await api.post(`/superadmin/tenants/${slug}/cutover`);
      toast.success(`"${slug}" migrado a schema dedicado`);
      await fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || `Error al migrar "${slug}"`);
      await fetchStatus(); // igual refresca -- el error ya quedó guardado del lado del backend
    } finally {
      setActionSlug(null);
    }
  };

  const handleRollback = async (slug) => {
    if (!window.confirm(
      `¿Revertir "${slug}" a modo legado?\n\nEsto sincroniza de vuelta a public los cambios hechos en su schema desde el corte. Los DELETE hechos dentro del schema NO se replican -- revisa eso antes si el tenant lleva tiempo migrado.`
    )) return;

    setActionSlug(slug);
    try {
      await api.post(`/superadmin/tenants/${slug}/rollback`);
      toast.success(`"${slug}" revertido a modo legado`);
      await fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || `Error al revertir "${slug}"`);
    } finally {
      setActionSlug(null);
    }
  };

  const handleCleanup = async (slug, execute) => {
    if (execute && !window.confirm(
      `¿Borrar de forma permanente los datos de "${slug}" en public?\n\nSolo borra tablas donde el conteo coincide exactamente con su schema dedicado. Esta acción no se puede deshacer.`
    )) return;

    setActionSlug(slug);
    try {
      const { data } = await api.post(`/superadmin/tenants/${slug}/cleanup`, { execute });
      setCleanupReport({ slug, execute, report: data.report });
      toast.success(execute ? `Limpieza de "${slug}" ejecutada` : `Dry-run de "${slug}" listo, revisa el detalle abajo`);
    } catch (error) {
      toast.error(error.response?.data?.error || `Error al limpiar datos de "${slug}"`);
    } finally {
      setActionSlug(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 dark:text-gray-100">
            <Database className="w-6 h-6" />
            Migración de Tenants a Schema-per-Tenant
          </h1>
          <p className="text-gray-500 mt-1 dark:text-gray-500">
            Estado de corte por tenant y acciones de cutover / rollback / limpieza, sin necesitar consola.
          </p>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={fetchStatus}>
          Refrescar
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-500">
                <th className="px-4 py-2">Tenant</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Schema</th>
                <th className="px-4 py-2">Último intento</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {tenants.map((t) => {
                const isBusy = actionSlug === t.slug;
                const failed = t.cutover_last_status === 'failed';
                return (
                  <tr key={t.id} className={failed ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{t.business_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">{t.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[t.status]}`}>
                        {t.status === 'migrado' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {t.status === 'migrado' ? 'Migrado' : 'Legado'}
                      </span>
                      {failed && (
                        <div className="mt-1 flex items-start gap-1 text-xs text-red-700 max-w-xs dark:text-red-400">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span title={t.cutover_last_error}>
                            {(t.cutover_last_error || '').slice(0, 80)}
                            {(t.cutover_last_error || '').length > 80 ? '…' : ''}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono dark:text-gray-400">
                      {t.schema_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-500">
                      {formatDate(t.cutover_last_attempt_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {t.status === 'legado' && (
                          <Button
                            size="sm"
                            variant={failed ? 'danger' : 'primary'}
                            loading={isBusy}
                            disabled={isBusy}
                            onClick={() => handleCutover(t.slug)}
                          >
                            {failed ? 'Reintentar cutover' : 'Migrar ahora'}
                          </Button>
                        )}
                        {t.status === 'migrado' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              icon={Undo2}
                              loading={isBusy}
                              disabled={isBusy}
                              onClick={() => handleRollback(t.slug)}
                            >
                              Rollback
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={isBusy}
                              disabled={isBusy}
                              onClick={() => handleCleanup(t.slug, false)}
                            >
                              Ver limpieza (dry-run)
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              icon={Trash2}
                              loading={isBusy}
                              disabled={isBusy}
                              onClick={() => handleCleanup(t.slug, true)}
                            >
                              Limpiar public
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    No hay tenants registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {cleanupReport && (
        <Card title={`Reporte de limpieza — ${cleanupReport.slug} (${cleanupReport.execute ? 'ejecutado' : 'dry-run'})`}>
          <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-x-auto max-h-96 dark:bg-graphite-2">
            {JSON.stringify(cleanupReport.report, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
};

export default TenantMigrationStatus;
