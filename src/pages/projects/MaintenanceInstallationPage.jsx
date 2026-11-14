import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import InstallationMaintenance from '../../components/projects/InstallationMaintenance';

/** Detalle de una instalación (sistema del cliente) y su mantenimiento (Fase 4, req. 1.3). */
export default function MaintenanceInstallationPage() {
  const { id } = useParams();
  return (
    <Layout>
      <div className="space-y-4">
        <Link to="/maintenance" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange-700"><ArrowLeft className="w-4 h-4" /> Mantenimientos</Link>
        <InstallationMaintenance key={id} installationId={id} />
      </div>
    </Layout>
  );
}
