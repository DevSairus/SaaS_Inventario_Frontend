import { useState } from 'react';
import toast from 'react-hot-toast';
import { Printer, Share2, Copy, Loader2 } from 'lucide-react';
import { ensambladoraComprobantesApi } from '../../api/ensambladora';

/**
 * Botones de "Imprimir comprobante" / "Compartir seguimiento" tras crear una
 * revisión o garantía -- mismo criterio que el flujo de compartir OT
 * (WorkOrderDetailPage.jsx: openPDF + generateShareToken), pero reutilizable
 * entre RevisionFormPage y GarantiaFormPage.
 */
export default function ComprobanteAcciones({ tipo, id }) {
  const [imprimiendo, setImprimiendo] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [whatsappUrl, setWhatsappUrl] = useState(null);

  const handleImprimir = async () => {
    setImprimiendo(true);
    try {
      const res = await ensambladoraComprobantesApi.getPdf(tipo, id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      toast.error('No se pudo generar el comprobante. Intenta de nuevo.');
    } finally {
      setImprimiendo(false);
    }
  };

  const handleCompartir = async () => {
    setCompartiendo(true);
    try {
      const res = await ensambladoraComprobantesApi.generarShareToken(tipo, id);
      setShareUrl(res.data?.data?.share_url || null);
      setWhatsappUrl(res.data?.data?.whatsapp_url || null);
    } catch {
      toast.error('No se pudo generar el link de seguimiento.');
    } finally {
      setCompartiendo(false);
    }
  };

  const handleCopiar = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar el link');
    }
  };

  return (
    <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Comprobante para el cliente</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleImprimir}
          disabled={imprimiendo}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-40"
        >
          {imprimiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Imprimir comprobante
        </button>
        {!shareUrl && (
          <button
            type="button"
            onClick={handleCompartir}
            disabled={compartiendo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-40"
          >
            {compartiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            Compartir seguimiento
          </button>
        )}
      </div>
      {shareUrl && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{shareUrl}</span>
          <button type="button" onClick={handleCopiar} className="flex items-center gap-1 text-xs font-medium text-primary-600">
            <Copy className="w-3 h-3" /> Copiar
          </button>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-green-600">
              Enviar por WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
