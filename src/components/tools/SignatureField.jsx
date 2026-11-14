import { useState } from 'react';
import { PenLine, X } from 'lucide-react';
import SignaturePad from './SignaturePad';

/**
 * Campo de firma para actas (despacho, checklist, cortes, etc.).
 * Muestra la firma ya tomada y un botón "Firmar" que abre un lienzo grande a
 * pantalla completa (cómodo en celular/tablet; en PC se firma con el mouse).
 *
 * value: { signature, name, document } | null
 * onChange(value | null)
 * role: texto del rol que firma (ej. "Transportador"); solo se muestra.
 * askDocument: pide también el documento del firmante.
 */
export default function SignatureField({ label, role, value, onChange, askDocument = false, required = false }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [name, setName] = useState(value?.name || '');
  const [doc, setDoc] = useState(value?.document || '');
  const [error, setError] = useState('');

  const openPad = () => { setDraft(null); setName(value?.name || ''); setDoc(value?.document || ''); setError(''); setOpen(true); };

  const accept = () => {
    if (!name.trim()) return setError('Escribe el nombre de quien firma');
    if (!draft) return setError('Falta la firma');
    onChange?.({ signature: draft, name: name.trim(), document: doc.trim() });
    setOpen(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium">
          {label}{role ? <span className="text-gray-500 font-normal"> · {role}</span> : null}{required ? ' *' : ''}
        </label>
        {value?.signature && (
          <button type="button" onClick={() => onChange?.(null)} className="text-xs text-gray-500 hover:text-red-600">Quitar</button>
        )}
      </div>

      {value?.signature ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-2">
          <img src={value.signature} alt={`Firma de ${value.name}`} className="h-14 bg-white rounded border border-gray-100" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium truncate">{value.name}</p>
            {value.document ? <p className="text-xs text-gray-500">{value.document}</p> : null}
          </div>
          <button type="button" onClick={openPad} className="text-xs text-blue-600 hover:underline">Cambiar</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPad}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 py-3 text-sm text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600"
        >
          <PenLine className="w-4 h-4" /> Firmar
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white dark:bg-gray-900 p-4 sm:p-6" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">{label}{role ? ` · ${role}` : ''}</h3>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="p-1 text-gray-500 hover:text-gray-800"><X className="w-5 h-5" /></button>
          </div>

          <div className={`grid gap-3 mb-3 ${askDocument ? 'sm:grid-cols-2' : ''}`}>
            <input
              value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de quien firma"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 px-3 py-2 text-sm"
            />
            {askDocument && (
              <input
                value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="Documento (opcional)"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 px-3 py-2 text-sm"
              />
            )}
          </div>

          <div className="flex-1 min-h-0">
            <SignaturePad onChange={setDraft} height={Math.max(220, Math.round(window.innerHeight * 0.45))} />
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600">Cancelar</button>
            <button type="button" onClick={accept} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Aceptar firma</button>
          </div>
        </div>
      )}
    </div>
  );
}
