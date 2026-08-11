// frontend/src/components/common/CrmNotifications.jsx
//
// CRM Fase B.6 — "notificaciones dentro de la app" (ver
// propuesta-mejora-crm-pitbox.md). Mismo patrón que StockAlerts.jsx: campana
// en el header, badge con conteo, dropdown con el detalle, polling periódico.
// A diferencia de StockAlert/PayableAlert no es una tabla de alertas
// persistida con estado resuelto/ignorado — es un conteo en vivo sobre datos
// que el CRM ya tiene (seguimientos vencidos + leads sin contactar), tal
// como pide la propuesta ("apoyándose en... un endpoint de conteo simple").
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Megaphone, CheckCircle2 } from 'lucide-react';
import crmApi from '../../api/crm';
import useTenantStore from '../../store/tenantStore';

function CrmNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const enabledModules = useTenantStore((s) => s.enabledModules);
  // A diferencia de TenantRoute (App.jsx), acá null no debe tratarse como
  // "con acceso": este componente dispara el fetch apenas hasCrm es true,
  // así que asumir acceso mientras carga el config del tenant dispara la
  // llamada antes de tiempo -- si el tenant no tiene CRM, el backend
  // responde 403 en cada carga de página.
  const hasCrm = enabledModules !== null && enabledModules.includes('crm');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.getNotificationsSummary();
      setSummary(res.data.data);
    } catch {
      // silencioso — si falla, la campana simplemente no muestra badge
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasCrm) return;
    fetchSummary();
    const interval = setInterval(fetchSummary, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [hasCrm, fetchSummary]);

  useEffect(() => {
    if (isOpen && hasCrm) fetchSummary();
  }, [isOpen, hasCrm, fetchSummary]);

  // Un tenant sin el módulo CRM no ve ni el ícono — nada que notificar.
  if (!hasCrm) return null;

  const total = summary?.total || 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-500"
        aria-label="Notificaciones CRM"
      >
        <Bell className="w-6 h-6" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div
            className="absolute right-0 mt-3 w-80 bg-white dark:bg-graphite rounded-xl shadow-xl z-50 border border-gray-200 dark:border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b dark:border-white/10 bg-gradient-to-r from-accent/10 to-purple-50 dark:to-purple-900/20">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificaciones CRM</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Lo que no se te puede pasar hoy</p>
            </div>

            <div className="p-2">
              {loading && !summary ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : total === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Al día</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Sin seguimientos vencidos ni leads sin atender</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {summary.overdue_followups > 0 && (
                    <button
                      onClick={() => { navigate('/crm/followups'); setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                    >
                      <div className="p-1.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 flex-shrink-0">
                        <AlertTriangle size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {summary.overdue_followups} seguimiento{summary.overdue_followups === 1 ? '' : 's'} vencido{summary.overdue_followups === 1 ? '' : 's'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">Ir a la bandeja de seguimiento</p>
                      </div>
                    </button>
                  )}
                  {summary.unattended_leads > 0 && (
                    <button
                      onClick={() => { navigate('/crm/pipeline'); setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-left"
                    >
                      <div className="p-1.5 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 flex-shrink-0">
                        <Megaphone size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {summary.unattended_leads} lead{summary.unattended_leads === 1 ? '' : 's'} sin contactar hace 2h+
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {summary.unattended_meta_leads > 0
                            ? `${summary.unattended_meta_leads} de Meta Ads — ir al pipeline`
                            : 'Ir al pipeline'}
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CrmNotifications;