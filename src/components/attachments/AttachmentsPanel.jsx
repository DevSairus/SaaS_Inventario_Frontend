import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Eye, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { usePermissions } from '../../store/tenantPermissionsStore';
import { getAttachments, uploadAttachment, downloadAttachment, deleteAttachment } from '../../api/attachments';
import { formatDateTime } from '../../utils/formatters';

export const ATTACHMENT_KINDS = {
  invoice_pdf: 'Factura (PDF)',
  invoice_xml: 'Factura electrónica (XML)',
  payment_proof: 'Soporte de pago',
  delivery_note: 'Remisión / entrega',
  photo: 'Foto',
  contract: 'Contrato / acta',
  quote: 'Cotización',
  other: 'Otro',
};

const ACCEPT = '.pdf,.xml,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.docx,.doc,.csv,.txt,.zip';
const VIEWABLE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const OWN_DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;

const sizeText = (b) => (!b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

// Tipo sugerido según la extensión del archivo.
const guessKind = (file, fallback) => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xml')) return 'invoice_xml';
  if (/\.(jpe?g|png|webp)$/.test(name)) return fallback === 'payment_proof' ? 'payment_proof' : 'photo';
  return fallback;
};

/**
 * Adjuntos de un documento: subir (botón o arrastrar), ver, descargar y quitar.
 * defaultKind: tipo preseleccionado (p. ej. 'payment_proof' en un pago).
 */
export default function AttachmentsPanel({ entityType, entityId, title = 'Adjuntos', defaultKind = 'other', compact = false, readOnly = false }) {
  const user = useAuthStore((s) => s.user);
  const can = usePermissions();
  const canWrite = !readOnly && can('attachments.write');
  const canDeleteAny = can('attachments.delete');
  const [rows, setRows] = useState(null);
  const [kind, setKind] = useState(defaultKind);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(() => {
    if (!entityId) return;
    getAttachments(entityType, entityId)
      .then((r) => setRows(r.data || []))
      .catch((e) => { setRows([]); if (e.response?.status !== 403) toast.error(e.response?.data?.message || 'Error al cargar los adjuntos'); });
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const upload = async (files) => {
    const list = [...(files || [])];
    if (!list.length) return;
    setBusy(true);
    let ok = 0;
    for (const file of list) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: supera 10 MB`); continue; }
      try {
        await uploadAttachment({ entityType, entityId, file, kind: guessKind(file, kind) });
        ok++;
      } catch (e) {
        toast.error(`${file.name}: ${e.response?.data?.message || 'no se pudo adjuntar'}`);
      }
    }
    setBusy(false);
    if (ok) { toast.success(ok === 1 ? 'Archivo adjuntado' : `${ok} archivos adjuntados`); load(); }
  };

  const open = async (att, inline) => {
    try {
      const blob = await downloadAttachment(att.id, { inline });
      const url = URL.createObjectURL(new Blob([blob], { type: att.mime_type || blob.type }));
      if (inline) {
        window.open(url, '_blank', 'noopener');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = att.file_name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error('No se pudo abrir el archivo');
    }
  };

  const remove = async (att) => {
    if (!window.confirm(`¿Quitar "${att.file_name}"?`)) return;
    try {
      await deleteAttachment(att.id);
      toast.success('Adjunto eliminado');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const canRemove = (att) => canDeleteAny
    || (att.uploaded_by === user?.id && Date.now() - new Date(att.created_at).getTime() < OWN_DELETE_WINDOW_MS);

  if (!entityId) return null;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border ${dragging ? 'border-orange-400 ring-2 ring-orange-200' : 'border-gray-200 dark:border-gray-700'} ${compact ? 'p-3' : 'p-5 shadow-sm'}`}
      onDragOver={(e) => { if (canWrite) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { if (!canWrite) return; e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Paperclip className="w-4 h-4" /> {title} {rows && rows.length > 0 && <span className="text-gray-400 font-normal">({rows.length})</span>}
        </h3>
        {canWrite && (
          <div className="flex items-center gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800">
              {Object.entries(ATTACHMENT_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            <button onClick={() => inputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
              <Upload className="w-4 h-4" /> {busy ? 'Subiendo...' : 'Adjuntar'}
            </button>
          </div>
        )}
      </div>

      {rows === null ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          Sin adjuntos.{canWrite && ' Arrastra aquí la factura, el XML, el soporte de pago o fotos (PDF, XML, imagen, Excel; máx. 10 MB).'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((a) => (
            <li key={a.id} className="py-2 flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate" title={a.file_name}>{a.file_name}</p>
                <p className="text-xs text-gray-500">
                  {ATTACHMENT_KINDS[a.kind] || a.kind} · {sizeText(a.size_bytes)} · {formatDateTime(a.created_at)}{a.uploader ? ` · ${a.uploader.name}` : ''}
                </p>
              </div>
              {VIEWABLE.includes(a.mime_type) && (
                <button onClick={() => open(a, true)} title="Ver" className="text-gray-400 hover:text-orange-600"><Eye className="w-4 h-4" /></button>
              )}
              <button onClick={() => open(a, false)} title="Descargar" className="text-gray-400 hover:text-orange-600"><Download className="w-4 h-4" /></button>
              {canRemove(a) && (
                <button onClick={() => remove(a)} title="Quitar" className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
