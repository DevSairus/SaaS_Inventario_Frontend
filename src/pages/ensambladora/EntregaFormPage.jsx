import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, PackageCheck, Loader2, Camera, X } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraEntregasApi } from '../../api/ensambladora';

const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100';
const today = () => new Date().toISOString().slice(0, 10);

export default function EntregaFormPage() {
  const { vin } = useParams();
  const navigate = useNavigate();

  const [fechaEntrega, setFechaEntrega] = useState(today());
  const [recibidoPor, setRecibidoPor] = useState('');
  const [evidenciaUrl, setEvidenciaUrl] = useState('');
  const [evidenciaFile, setEvidenciaFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEvidenciaFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearFile = () => {
    setEvidenciaFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fechaEntrega) {
      toast.error('La fecha de entrega es obligatoria.');
      return;
    }
    setSaving(true);
    try {
      await ensambladoraEntregasApi.create(
        {
          vin,
          fecha_entrega: fechaEntrega,
          recibido_por: recibidoPor || undefined,
          evidencia_url: !evidenciaFile ? (evidenciaUrl || undefined) : undefined,
        },
        evidenciaFile
      );
      toast.success('Entrega registrada — arranca el conteo de garantía');
      navigate(`/ensambladora/vehiculos/${encodeURIComponent(vin)}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'No se pudo registrar la entrega';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-6 px-4">
        <Link
          to={`/ensambladora/vehiculos/${encodeURIComponent(vin)}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al vehículo
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <PackageCheck className="w-5 h-5 text-primary-600" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Registrar entrega</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-mono">{vin}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Al confirmar, el vehículo queda "en garantía" y arranca el conteo desde esta fecha.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha de entrega *</label>
            <input type="date" required value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Recibido por</label>
            <input type="text" value={recibidoPor} onChange={(e) => setRecibidoPor(e.target.value)} className={inputCls} placeholder="Nombre de quien recibe el vehículo" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Evidencia fotográfica</label>
            {!previewUrl ? (
              <label className="flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-white/15 rounded-lg px-4 py-4 text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:border-primary-400 hover:text-primary-600">
                <Camera className="w-4 h-4" />
                Tomar / adjuntar foto
                <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
              </label>
            ) : (
              <div className="relative inline-block">
                <img src={previewUrl} alt="Evidencia de entrega" className="max-h-48 rounded-lg border border-gray-200 dark:border-white/10" />
                <button type="button" onClick={clearFile} className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {!evidenciaFile && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">…o URL de evidencia</label>
              <input type="url" value={evidenciaUrl} onChange={(e) => setEvidenciaUrl(e.target.value)} className={inputCls} placeholder="https://…" />
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar entrega
          </button>
        </form>
      </div>
    </Layout>
  );
}
