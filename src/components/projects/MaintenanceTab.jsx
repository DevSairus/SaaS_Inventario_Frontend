import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarCheck } from 'lucide-react';
import { usePermissions } from '../../store/tenantPermissionsStore';
import { activateProjectMaintenance, getProjectMaintenance } from '../../api/projects';
import InstallationMaintenance from './InstallationMaintenance';

/**
 * Pestaña Mantenimiento del proyecto (Fase 4, req. 1.3). El mantenimiento es
 * de la instalación (el sistema del cliente): se activa una vez y crea la
 * instalación con los datos del proyecto. Las instalaciones anteriores a
 * Pitbox se crean en Mantenimientos → Instalaciones.
 */
export default function MaintenanceTab({ project }) {
  const can = usePermissions();
  const [data, setData] = useState(undefined);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getProjectMaintenance(project.id).then((r) => setData(r.data)).catch((e) => { setData(null); toast.error(e.response?.data?.message || 'Error al cargar el mantenimiento'); });
  }, [project.id]);
  useEffect(() => { load(); }, [load]);

  const activate = async () => {
    setBusy(true);
    try {
      const r = await activateProjectMaintenance(project.id);
      toast.success(r.message);
      setData(r.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo activar el mantenimiento');
    } finally {
      setBusy(false);
    }
  };

  if (data === undefined) return <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center space-y-3">
        <CalendarCheck className="w-8 h-8 mx-auto text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Activa el mantenimiento para registrar el sistema instalado de este proyecto, sus equipos y sus planes de visitas.
        </p>
        {can('projects.maintenance.manage') && project.status !== 'cancelled' && (
          <button type="button" onClick={activate} disabled={busy} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
            {busy ? 'Activando…' : 'Activar mantenimiento'}
          </button>
        )}
      </div>
    );
  }
  return <InstallationMaintenance key={data.installation.id} installationId={data.installation.id} initial={data} />;
}
