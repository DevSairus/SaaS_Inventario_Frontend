// frontend/src/components/sales/SaleCirculationPanel.jsx
/**
 * Panel de circulación como título valor — Fase 4 (ver
 * 00 - Documentación/RADIAN-Analisis-y-Plan.md §4/§6). Solo aparece cuando
 * la factura ya fue aceptada (033 recibido o 034 emitido) y es a crédito —
 * requisito para inscribirse (036). Condicionada a demanda real de
 * factoring, como marca el propio plan — no está pensado para el uso
 * diario de la mayoría de tenants.
 *
 * Sin botones de "Limitar/Terminar limitación" (041/042) a propósito:
 * confirmado contra el Anexo RADIAN v1.0 (numeral 13.2.1, pág. 357) que el
 * Responsable de esos dos eventos es la "Autoridad judicial o
 * administrativa", no el emisor/tenedor — un tenant normal de Pitbox
 * (taller, comercio) no lo es. Los endpoints siguen disponibles por API
 * para el caso atípico de un tenant que sí lo sea (ver radianService.js).
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Landmark, ArrowRightLeft, UserCog, Banknote, FileCheck2 } from 'lucide-react';
import {
  emitRadianInscripcion, emitRadianEndoso, cancelRadianEndoso,
  emitRadianMandato, terminarRadianMandato,
  emitRadianPago, emitRadianInformePago,
} from '../../api/radian';

export default function SaleCirculationPanel({ sale, onUpdate }) {
  const [acting, setActing] = useState(false);
  const [openForm, setOpenForm] = useState(null); // 'endoso' | 'limitacion' | 'mandato' | 'pago' | 'informe' | null

  const eligibleToInscribe = ['033_received', '034'].includes(sale?.radian_status) && Number(sale?.credit_days) > 0;
  const circulation = sale?.radian_circulation || {};
  const inscribed = !!circulation.inscribed_at;

  if (!eligibleToInscribe && !inscribed) return null;

  const refresh = () => { setOpenForm(null); onUpdate?.(); };

  const run = async (action, okMsg) => {
    setActing(true);
    try {
      const res = await action();
      const accepted = res.data?.data?.accepted;
      toast[accepted === false ? 'error' : 'success'](res.data?.message || okMsg);
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al emitir el evento');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden no-print">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
          <Landmark className="w-4 h-4" /> Circulación como título valor
        </h4>
        {inscribed && <span className="text-xs text-green-700 font-medium">Inscrita</span>}
      </div>

      <div className="p-4 space-y-3">
        {!inscribed ? (
          <>
            <p className="text-xs text-gray-500">
              Esta factura a crédito ya fue aceptada — puede inscribirse en RADIAN como título valor para poder
              endosarla, asignar un mandato o gestionar su pago por esta vía.
            </p>
            <button disabled={acting} onClick={() => run(() => emitRadianInscripcion(sale.id), 'Inscripción (036) aceptada')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              <Landmark className="w-3.5 h-3.5" /> Inscribir en RADIAN (036)
            </button>
          </>
        ) : (
          <>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Tenedor legítimo: <strong>{circulation.holder_name || 'el emisor (sin endoso)'}</strong></div>
              <div>Circulación: <strong>{circulation.circulation_restricted ? 'limitada' : 'libre'}</strong></div>
              <div>Mandato: <strong>{circulation.mandate_name || 'sin mandato'}</strong></div>
            </div>

            <div className="flex gap-2 flex-wrap pt-1">
              {!circulation.holder_nit && !circulation.circulation_restricted && (
                <button disabled={acting} onClick={() => setOpenForm(v => v === 'endoso' ? null : 'endoso')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Endosar
                </button>
              )}
              {circulation.holder_nit && (
                <button disabled={acting} onClick={() => run(() => cancelRadianEndoso(sale.id), 'Cancelación del endoso (040) aceptada')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Cancelar endoso
                </button>
              )}
              {!circulation.mandate_nit ? (
                <button disabled={acting} onClick={() => setOpenForm(v => v === 'mandato' ? null : 'mandato')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium">
                  <UserCog className="w-3.5 h-3.5" /> Asignar mandato
                </button>
              ) : (
                <button disabled={acting} onClick={() => run(() => terminarRadianMandato(sale.id), 'Terminación del mandato (044) aceptada')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium">
                  <UserCog className="w-3.5 h-3.5" /> Terminar mandato
                </button>
              )}
              <button disabled={acting} onClick={() => setOpenForm(v => v === 'pago' ? null : 'pago')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium">
                <Banknote className="w-3.5 h-3.5" /> Registrar pago
              </button>
              <button disabled={acting} onClick={() => setOpenForm(v => v === 'informe' ? null : 'informe')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium">
                <FileCheck2 className="w-3.5 h-3.5" /> Informe para el pago
              </button>
            </div>

            {openForm === 'endoso' && <EndosoForm acting={acting} onSubmit={(v) => run(() => emitRadianEndoso(sale.id, v.tipo, v.holderNit, v.holderName, v.terms), `Endoso en ${v.tipo} aceptado`)} />}
            {openForm === 'mandato' && <MandatoForm acting={acting} onSubmit={(v) => run(() => emitRadianMandato(sale.id, v.nit, v.name), 'Mandato (043) aceptado')} />}
            {openForm === 'pago' && <PagoForm acting={acting} onSubmit={(v) => run(() => emitRadianPago(sale.id, v.amount, v.date, v.method), 'Pago (045) aceptado')} />}
            {openForm === 'informe' && <ReasonForm placeholder="Nota del informe (opcional)" required={false} acting={acting} onSubmit={(note) => run(() => emitRadianInformePago(sale.id, note), 'Informe (046) aceptado')} />}
          </>
        )}
      </div>
    </div>
  );
}

function ReasonForm({ placeholder, required = true, acting, onSubmit }) {
  const [value, setValue] = useState('');
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <textarea value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} rows="2"
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
      <div className="flex justify-end">
        <button disabled={acting || (required && !value.trim())} onClick={() => onSubmit(value)}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          Enviar
        </button>
      </div>
    </div>
  );
}

function EndosoForm({ acting, onSubmit }) {
  const [tipo, setTipo] = useState('propiedad');
  const [holderNit, setHolderNit] = useState('');
  const [holderName, setHolderName] = useState('');
  const [terms, setTerms] = useState('');
  const valid = holderNit.trim() && holderName.trim();
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
        <option value="propiedad">Endoso en propiedad</option>
        <option value="garantia">Endoso en garantía</option>
        <option value="procuracion">Endoso en procuración</option>
      </select>
      <input value={holderNit} onChange={e => setHolderNit(e.target.value)} placeholder="NIT del endosatario"
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
      <input value={holderName} onChange={e => setHolderName(e.target.value)} placeholder="Nombre del endosatario"
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
      <input value={terms} onChange={e => setTerms(e.target.value)} placeholder="Términos (opcional)"
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
      <div className="flex justify-end">
        <button disabled={acting || !valid} onClick={() => onSubmit({ tipo, holderNit, holderName, terms })}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          Endosar
        </button>
      </div>
    </div>
  );
}

function MandatoForm({ acting, onSubmit }) {
  const [nit, setNit] = useState('');
  const [name, setName] = useState('');
  const valid = nit.trim() && name.trim();
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <input value={nit} onChange={e => setNit(e.target.value)} placeholder="NIT del mandatario"
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del mandatario"
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
      <div className="flex justify-end">
        <button disabled={acting || !valid} onClick={() => onSubmit({ nit, name })}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          Asignar
        </button>
      </div>
    </div>
  );
}

function PagoForm({ acting, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [method, setMethod] = useState('');
  const valid = Number(amount) > 0;
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto pagado"
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
      <input value={method} onChange={e => setMethod(e.target.value)} placeholder="Medio de pago (opcional)"
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
      <div className="flex justify-end">
        <button disabled={acting || !valid} onClick={() => onSubmit({ amount, date, method })}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          Registrar pago
        </button>
      </div>
    </div>
  );
}
