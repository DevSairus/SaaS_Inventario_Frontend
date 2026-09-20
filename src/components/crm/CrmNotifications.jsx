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
import { Bell, AlertTriangle, Megaphone, CheckCircle2, Flag } from 'lucide-react';
import crmApi from '../../api/crm';
import useTenantStore from '../../store/tenantStore';
import useNotificationsBundleStore from '../../store/notificationsBundleStore';

function CrmNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  // Fase 6 — alertas de metas propias (período por vencer + cuánto falta).
  // Vive separado de `summary` porque viene de un endpoint distinto
  // (goals.controller.js) y se apaga solo si la gamificación está
  // deshabilitada, no si el módulo CRM lo está.
  const [goalAlerts, setGoalAlerts] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const enabledModules = useTenantStore((s) => s.enabledModules);
  const bundleCrm = useNotificationsBundleStore((s) => s.data.crm);
  const bundleCrmGoals = useNotificationsBundleStore((s) => s.data.crm_goals);
  // A diferencia de TenantRoute (App.jsx), acá null no debe tratarse como
  // "con acceso": este componente dispara el fetch apenas hasCrm es true,
  // así que asumir acceso mientras carga el config del tenant dispara la
  // llamada antes de tiempo -- si el tenant no tiene CRM, el backend
  // responde 403 en cada carga de página.
  const hasCrm = enabledModules !== null && enabledModules.includes('crm');

  // Antes: fetch propio cada 2 min. Ahora se alimenta del bundle
  // consolidado (Layout.jsx llama startPolling una sola vez, cada 30 min).
  useEffect(() => {
    if (hasCrm && bundleCrm) setSummary(bundleCrm);
  }, [hasCrm, bundleCrm]);

  useEffect(() => {
    if (hasCrm && bundleCrmGoals) setGoalAlerts(bundleCrmGoals);
  }, [hasCrm, bundleCrmGoals]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [notifRes, goalsRes] = await Promise.all([
        crmApi.getNotificationsSummary(),
        crmApi.getGoalAlerts().catch(() => null), // gamificación puede estar apagada
      ]);
      setSummary(notifRes.data.data);
      if (goalsRes) setGoalAlerts({ data: goalsRes.data.data, summary: goalsRes.data.summary });
    } catch {
      // silencioso — si falla, la campana simplemente no muestra badge
    } finally {
      setLoading(false);
    }
  }, []);

  // Recargar al abrir el dropdown (acción del usuario, no un timer).
  useEffect(() => {
    if (isOpen && hasCrm) fetchSummary();
  }, [isOpen, hasCrm, fetchSummary]);

  // Un tenant sin el módulo CRM no ve ni el ícono — nada que notificar.
  if (!hasCrm) return null;

  const goalAlertList = goalAlerts?.data || [];
  const criticalGoalAlerts = goalAlerts?.summary?.criticas || 0;
  // El badge (número rojo) solo cuenta las 'critica' — la 'alta' todavía
  // tiene margen y sumarla haría que la campana se ponga roja muy pronto.
  const total = (summary?.total || 0) + criticalGoalAlerts;
  // Para decidir si el dropdown muestra "Al día" sí cuentan ambas: una
  // meta 'alta' es información que el asesor debe ver, aunque no amerite
  // ponerle el badge en rojo todavía.
  const hasAnythingToShow = (summary?.total || 0) + goalAlertList.length > 0;

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
              {loading && !summary && !goalAlerts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : !hasAnythingToShow ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Al día</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Sin seguimientos vencidos, leads sin atender ni metas por vencer</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {goalAlertList.map((alert) => {
                    const isCritical = alert.urgency === 'critica';
                    return (
                      <button
                        key={`${alert.goal_id}`}
                        onClick={() => { navigate('/crm/dashboard'); setIsOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left ${
                          isCritical ? 'hover:bg-red-50 dark:hover:bg-red-900/20' : 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        }`}
                      >
                        <div className={`p-1.5 rounded-full flex-shrink-0 ${
                          isCritical
                            ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        }`}>
                          <Flag size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {alert.name} — quedan {alert.days_remaining} día{alert.days_remaining === 1 ? '' : 's'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {alert.remaining_value == null
                              ? `Vas en ${Math.round(alert.percent)}% de cumplimiento`
                              : `Te faltan ${Math.round(alert.remaining_value).toLocaleString('es-CO')} para la meta`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  {summary?.overdue_followups > 0 && (
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
                  {summary?.unattended_leads > 0 && (
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