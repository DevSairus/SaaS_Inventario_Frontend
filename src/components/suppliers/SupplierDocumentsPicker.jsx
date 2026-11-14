// frontend/src/components/suppliers/SupplierDocumentsPicker.jsx
/**
 * Documentos del proveedor que se eligen en el ALTA (el proveedor aún no tiene
 * id, así que los archivos quedan en memoria y se suben justo después de crearlo
 * con uploadSupplierDocuments). Al editar se usa AttachmentsPanel.
 */
import { useRef } from 'react';
import { FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadAttachment } from '../../api/attachments';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';

export const EMPTY_SUPPLIER_DOCS = { rut: null, chamber: null, chamberValidUntil: '' };

function FileField({ label, hint, file, onPick, onClear }) {
  const ref = useRef(null);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = '';
          if (!picked) return;
          if (picked.size > MAX_BYTES) { toast.error(`${picked.name}: supera 10 MB`); return; }
          onPick(picked);
        }}
      />
      {file ? (
        <div className="flex items-center gap-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2">
          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="truncate flex-1" title={file.name}>{file.name}</span>
          <button type="button" onClick={onClear} title="Quitar" className="text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full px-3 py-2 border border-dashed border-gray-300 dark:border-white/20 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
        >
          Seleccionar archivo (PDF o imagen)
        </button>
      )}
      {hint && <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">{hint}</p>}
    </div>
  );
}

export default function SupplierDocumentsPicker({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FileField
        label="RUT"
        hint="Opcional. Se guarda en los documentos del proveedor."
        file={value.rut}
        onPick={(f) => set({ rut: f })}
        onClear={() => set({ rut: null })}
      />
      <div className="space-y-2">
        <FileField
          label="Cámara de Comercio"
          hint="Opcional. Indique hasta cuándo es vigente el certificado."
          file={value.chamber}
          onPick={(f) => set({ chamber: f })}
          onClear={() => set({ chamber: null, chamberValidUntil: '' })}
        />
        {value.chamber && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Vigente hasta</label>
            <input
              type="date"
              value={value.chamberValidUntil}
              onChange={(e) => set({ chamberValidUntil: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2 dark:text-gray-100"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Sube los documentos elegidos al proveedor recién creado. Un fallo no revierte
 * el alta: se avisa y el usuario puede adjuntarlos al editar el proveedor.
 * @returns {Promise<boolean>} true si todo subió bien.
 */
export async function uploadSupplierDocuments(supplierId, docs) {
  const jobs = [];
  if (docs.rut) jobs.push({ file: docs.rut, kind: 'rut', label: 'RUT' });
  if (docs.chamber) {
    jobs.push({ file: docs.chamber, kind: 'chamber_of_commerce', label: 'Cámara de Comercio', validUntil: docs.chamberValidUntil });
  }
  let allOk = true;
  for (const job of jobs) {
    try {
      await uploadAttachment({
        entityType: 'supplier', entityId: supplierId, file: job.file, kind: job.kind, validUntil: job.validUntil,
      });
    } catch (e) {
      allOk = false;
      toast.error(`${job.label}: ${e.response?.data?.message || 'no se pudo adjuntar'}. Puede adjuntarlo editando el proveedor.`);
    }
  }
  return allOk;
}
