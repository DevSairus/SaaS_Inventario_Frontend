// frontend/src/pages/accounting/ExogenaPage.jsx
//
// Información Exógena DIAN — Fase 4 del plan de Contabilidad Pitbox. Ver
// Contabilidad-Plan-Ejecucion-Fases-1-4.md §Fase 4.
//
// Checklist de los 13 formatos seleccionables por tenant. Por formato
// habilitado e implementado: configurar conceptos (si aplica), validar
// completitud y generar/descargar el archivo XML "muisca" del año gravable.
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import Layout from '../../components/layout/Layout';
import { exogenaAPI } from '../../api/accounting';
import {
  CheckCircleIcon, ClockIcon, ExclamationTriangleIcon,
  ArrowDownTrayIcon, Cog6ToothIcon, ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline';

const StatusBadge = ({ dataSource, isEnabled }) => {
  if (dataSource === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400">
        <ClockIcon className="w-3 h-3" /> Próximamente
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
    }`}>
      <CheckCircleIcon className="w-3 h-3" /> {isEnabled ? 'Habilitado' : 'Deshabilitado'}
    </span>
  );
};

const inputCls = 'w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none';

function ConceptsPanel({ format, year }) {
  const [data, setData] = useState(null);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await exogenaAPI.getConcepts(format.code, year);
    setData(res.data);
    const initial = {};
    // Precarga con la sugerencia oficial (tabla de conceptos de la
    // Resolución 000227/2025) cuando todavía no hay nada guardado --
    // sigue siendo editable, el contador debe confirmarla.
    for (const key of res.data.source_keys) {
      if (res.data.suggestions?.[key]) initial[key] = res.data.suggestions[key];
    }
    for (const m of res.data.mappings) initial[m.source_key] = m.concept_code;
    setValues(initial);
  }, [format.code, year]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="text-sm text-gray-400 p-3">Cargando conceptos...</div>;
  if (data.source_keys.length === 0) {
    return <div className="text-sm text-gray-400 p-3">No hay transacciones del año {year} para este formato todavía.</div>;
  }

  const save = async () => {
    setSaving(true);
    try {
      const mappings = Object.entries(values)
        .filter(([, v]) => v && String(v).trim())
        .map(([source_key, concept_code]) => ({ source_key, concept_code }));
      await exogenaAPI.saveConcepts(format.code, mappings);
      toast.success('Conceptos guardados');
      load();
    } catch {
      toast.error('Error al guardar los conceptos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 space-y-2 bg-gray-50 dark:bg-graphite-2 rounded-lg">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Asigna el código de concepto DIAN a cada naturaleza de transacción detectada. Donde aparece un valor
        precargado es una sugerencia tomada de la tabla de conceptos de la Resolución 000227/2025 —
        confírmala o corrígela antes de generar el archivo. Sin esto, el formato no se puede generar.
      </p>
      {data.source_keys.map((key) => (
        <div key={key} className="flex items-center gap-2">
          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{key}</span>
          {data.suggestions?.[key] && !data.mappings.some((m) => m.source_key === key) && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400">sugerido</span>
          )}
          <input
            className={`${inputCls} max-w-[140px]`}
            placeholder="Código concepto"
            value={values[key] || ''}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
          />
        </div>
      ))}
      <button
        onClick={save}
        disabled={saving}
        className="mt-1 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar conceptos'}
      </button>
    </div>
  );
}

// Base genérica para los formatos alimentados por ExogenaManualRecord
// (1004, 1011, 1647) -- cada uno define sus propios campos de formulario y
// columnas de tabla, pero comparten la misma carga/alta/baja.
function useManualRecords(formatCode, year) {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    const res = await exogenaAPI.getManualRecords(formatCode, year);
    setRows(res.data);
  }, [formatCode, year]);
  useEffect(() => { load(); }, [load]);
  return { rows, load };
}

function Format1004Panel({ format, year, documentTypes }) {
  const { rows, load } = useManualRecords(format.code, year);
  const [form, setForm] = useState({ third_party_document_type: '31', third_party_tax_id: '', vdesc: '', vdescsol: '', raz: '', dir: '' });
  const [loading, setLoading] = useState(false);

  const addRow = async () => {
    if (!form.third_party_tax_id || !form.vdesc) {
      toast.error('Identificación y valor del descuento son obligatorios');
      return;
    }
    setLoading(true);
    try {
      await exogenaAPI.createManualRecord({
        format_code: format.code,
        fiscal_year: year,
        third_party_document_type: form.third_party_document_type,
        third_party_tax_id: form.third_party_tax_id,
        payload: {
          raz: form.raz || null,
          dir: form.dir || null,
          pais: '169',
          vdesc: parseInt(form.vdesc, 10) || 0,
          vdescsol: parseInt(form.vdescsol, 10) || parseInt(form.vdesc, 10) || 0,
        },
      });
      setForm({ third_party_document_type: '31', third_party_tax_id: '', vdesc: '', vdescsol: '', raz: '', dir: '' });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al guardar el registro');
    } finally {
      setLoading(false);
    }
  };

  const removeRow = async (id) => { await exogenaAPI.deleteManualRecord(id); load(); };

  return (
    <div className="p-3 space-y-3 bg-gray-50 dark:bg-graphite-2 rounded-lg">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Pitbox no registra descuentos tributarios en ningún módulo hoy — captura aquí los datos del año {year} a mano.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <select className={inputCls} value={form.third_party_document_type} onChange={(e) => setForm((f) => ({ ...f, third_party_document_type: e.target.value }))}>
          {documentTypes.map((d) => <option key={d.code} value={d.code}>{d.code} - {d.label}</option>)}
        </select>
        <input className={inputCls} placeholder="NIT/Documento" value={form.third_party_tax_id} onChange={(e) => setForm((f) => ({ ...f, third_party_tax_id: e.target.value }))} />
        <input className={inputCls} placeholder="Razón social / nombre" value={form.raz} onChange={(e) => setForm((f) => ({ ...f, raz: e.target.value }))} />
        <input className={inputCls} placeholder="Dirección" value={form.dir} onChange={(e) => setForm((f) => ({ ...f, dir: e.target.value }))} />
        <input className={inputCls} type="number" placeholder="Valor total del año" value={form.vdesc} onChange={(e) => setForm((f) => ({ ...f, vdesc: e.target.value }))} />
        <input className={inputCls} type="number" placeholder="Valor solicitado" value={form.vdescsol} onChange={(e) => setForm((f) => ({ ...f, vdescsol: e.target.value }))} />
      </div>
      <button onClick={addRow} disabled={loading} className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
        Agregar registro
      </button>

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="py-1 pr-2">Tipo doc</th><th className="py-1 pr-2">NIT</th><th className="py-1 pr-2">Nombre</th>
                <th className="py-1 pr-2">Vdesc</th><th className="py-1 pr-2">Vdescsol</th><th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-white/10">
                  <td className="py-1 pr-2">{r.third_party_document_type}</td>
                  <td className="py-1 pr-2">{r.third_party_tax_id}</td>
                  <td className="py-1 pr-2">{r.payload?.raz || '-'}</td>
                  <td className="py-1 pr-2">{r.payload?.vdesc}</td>
                  <td className="py-1 pr-2">{r.payload?.vdescsol}</td>
                  <td className="py-1"><button onClick={() => removeRow(r.id)} className="text-red-500 hover:underline">Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Formato 1011 — no reporta tercero, solo (concepto, saldo). Reutiliza
// ExogenaManualRecord guardando el concepto en third_party_tax_id (ver
// format1011.service.js para la explicación completa de este atajo).
function Format1011Panel({ format, year }) {
  const { rows, load } = useManualRecords(format.code, year);
  const [form, setForm] = useState({ cpt: '', sal: '' });
  const [loading, setLoading] = useState(false);

  const addRow = async () => {
    if (!form.cpt || !form.sal) {
      toast.error('Concepto y saldo son obligatorios');
      return;
    }
    setLoading(true);
    try {
      await exogenaAPI.createManualRecord({
        format_code: format.code,
        fiscal_year: year,
        third_party_document_type: '00',
        third_party_tax_id: form.cpt,
        payload: { sal: parseInt(form.sal, 10) || 0 },
      });
      setForm({ cpt: '', sal: '' });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al guardar el registro');
    } finally {
      setLoading(false);
    }
  };

  const removeRow = async (id) => { await exogenaAPI.deleteManualRecord(id); load(); };

  return (
    <div className="p-3 space-y-3 bg-gray-50 dark:bg-graphite-2 rounded-lg">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Resumen de tu declaración de renta del año {year} — captúralo con la cartilla de Exógena a la mano
        (cada fila es un concepto de la declaración con su saldo).
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input className={inputCls} placeholder="Código concepto (ej. 1305)" value={form.cpt} onChange={(e) => setForm((f) => ({ ...f, cpt: e.target.value }))} />
        <input className={inputCls} type="number" placeholder="Saldo a 31 de diciembre" value={form.sal} onChange={(e) => setForm((f) => ({ ...f, sal: e.target.value }))} />
      </div>
      <button onClick={addRow} disabled={loading} className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
        Agregar registro
      </button>
      {rows.length > 0 && (
        <table className="w-full text-xs">
          <thead><tr className="text-left text-gray-500 dark:text-gray-400"><th className="py-1 pr-2">Concepto</th><th className="py-1 pr-2">Saldo</th><th className="py-1"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-200 dark:border-white/10">
                <td className="py-1 pr-2">{r.third_party_tax_id}</td>
                <td className="py-1 pr-2">{r.payload?.sal}</td>
                <td className="py-1"><button onClick={() => removeRow(r.id)} className="text-red-500 hover:underline">Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Formato 1647 — dos terceros: de quien se recibe el ingreso (third_party_*)
// y el beneficiario real (payload.*i). Concepto fijo 4070.
function Format1647Panel({ format, year, documentTypes }) {
  const { rows, load } = useManualRecords(format.code, year);
  const emptyForm = {
    third_party_document_type: '13', third_party_tax_id: '', nom1: '', apl1: '', raz: '',
    vtotal: '', ving: '', vret: '',
    tdoc2: '13', nid2i: '', nom1i: '', apl1i: '', razi: '', dir: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const addRow = async () => {
    if (!form.third_party_tax_id || !form.nid2i || !form.vtotal) {
      toast.error('Identificación de ambos terceros y valor total son obligatorios');
      return;
    }
    setLoading(true);
    try {
      await exogenaAPI.createManualRecord({
        format_code: format.code,
        fiscal_year: year,
        third_party_document_type: form.third_party_document_type,
        third_party_tax_id: form.third_party_tax_id,
        payload: {
          nom1: form.nom1 || null, apl1: form.apl1 || null, raz: form.raz || null, pais: '169',
          vtotal: parseInt(form.vtotal, 10) || 0,
          ving: parseInt(form.ving, 10) || 0,
          vret: parseInt(form.vret, 10) || 0,
          tdoc2: form.tdoc2, nid2i: form.nid2i,
          nom1i: form.nom1i || null, apl1i: form.apl1i || null, razi: form.razi || null,
          dir: form.dir || null, paist: '169',
        },
      });
      setForm(emptyForm);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al guardar el registro');
    } finally {
      setLoading(false);
    }
  };

  const removeRow = async (id) => { await exogenaAPI.deleteManualRecord(id); load(); };

  return (
    <div className="p-3 space-y-3 bg-gray-50 dark:bg-graphite-2 rounded-lg">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Ingresos que recibiste por cuenta de un tercero (concepto 4070 fijo) — captura ambas partes: de quién
        recibiste el ingreso y para quién era realmente.
      </p>
      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">De quién se recibió el ingreso</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <select className={inputCls} value={form.third_party_document_type} onChange={(e) => setForm((f) => ({ ...f, third_party_document_type: e.target.value }))}>
          {documentTypes.map((d) => <option key={d.code} value={d.code}>{d.code} - {d.label}</option>)}
        </select>
        <input className={inputCls} placeholder="NIT/Documento" value={form.third_party_tax_id} onChange={(e) => setForm((f) => ({ ...f, third_party_tax_id: e.target.value }))} />
        <input className={inputCls} placeholder="Nombre" value={form.nom1} onChange={(e) => setForm((f) => ({ ...f, nom1: e.target.value }))} />
        <input className={inputCls} placeholder="Apellido" value={form.apl1} onChange={(e) => setForm((f) => ({ ...f, apl1: e.target.value }))} />
        <input className={inputCls} placeholder="Razón social (si aplica)" value={form.raz} onChange={(e) => setForm((f) => ({ ...f, raz: e.target.value }))} />
      </div>
      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Para quién era el ingreso (beneficiario real)</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <select className={inputCls} value={form.tdoc2} onChange={(e) => setForm((f) => ({ ...f, tdoc2: e.target.value }))}>
          {documentTypes.map((d) => <option key={d.code} value={d.code}>{d.code} - {d.label}</option>)}
        </select>
        <input className={inputCls} placeholder="NIT/Documento" value={form.nid2i} onChange={(e) => setForm((f) => ({ ...f, nid2i: e.target.value }))} />
        <input className={inputCls} placeholder="Nombre" value={form.nom1i} onChange={(e) => setForm((f) => ({ ...f, nom1i: e.target.value }))} />
        <input className={inputCls} placeholder="Apellido" value={form.apl1i} onChange={(e) => setForm((f) => ({ ...f, apl1i: e.target.value }))} />
        <input className={inputCls} placeholder="Razón social (si aplica)" value={form.razi} onChange={(e) => setForm((f) => ({ ...f, razi: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input className={inputCls} type="number" placeholder="Valor total operación" value={form.vtotal} onChange={(e) => setForm((f) => ({ ...f, vtotal: e.target.value }))} />
        <input className={inputCls} type="number" placeholder="Valor reintegrado/transferido" value={form.ving} onChange={(e) => setForm((f) => ({ ...f, ving: e.target.value }))} />
        <input className={inputCls} type="number" placeholder="Retención transferida" value={form.vret} onChange={(e) => setForm((f) => ({ ...f, vret: e.target.value }))} />
        <input className={inputCls} placeholder="Dirección" value={form.dir} onChange={(e) => setForm((f) => ({ ...f, dir: e.target.value }))} />
      </div>
      <button onClick={addRow} disabled={loading} className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
        Agregar registro
      </button>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-gray-500 dark:text-gray-400">
              <th className="py-1 pr-2">De quién</th><th className="py-1 pr-2">Para quién</th><th className="py-1 pr-2">Vtotal</th><th className="py-1"></th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-white/10">
                  <td className="py-1 pr-2">{r.third_party_tax_id}</td>
                  <td className="py-1 pr-2">{r.payload?.nid2i}</td>
                  <td className="py-1 pr-2">{r.payload?.vtotal}</td>
                  <td className="py-1"><button onClick={() => removeRow(r.id)} className="text-red-500 hover:underline">Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Formato 1010 — composición societaria (ExogenaShareholder, CRUD propio).
function ShareholdersPanel({ format, year, documentTypes }) {
  const [rows, setRows] = useState([]);
  const emptyForm = {
    document_type: '13', tax_id: '', first_name: '', last_name: '', business_name: '',
    address: '', city_code: '', nominal_value: '', premium_value: '', participation_percentage: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await exogenaAPI.getShareholders(year);
    setRows(res.data);
  }, [year]);
  useEffect(() => { load(); }, [load]);

  const addRow = async () => {
    if (!form.tax_id || !form.participation_percentage) {
      toast.error('Identificación y porcentaje de participación son obligatorios');
      return;
    }
    setLoading(true);
    try {
      await exogenaAPI.createShareholder({
        fiscal_year: year,
        document_type: form.document_type,
        tax_id: form.tax_id,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        business_name: form.business_name || null,
        address: form.address || null,
        city_code: form.city_code || null,
        nominal_value: parseInt(form.nominal_value, 10) || 0,
        premium_value: parseInt(form.premium_value, 10) || 0,
        participation_percentage: parseFloat(form.participation_percentage),
      });
      setForm(emptyForm);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al guardar el socio/accionista');
    } finally {
      setLoading(false);
    }
  };

  const removeRow = async (id) => { await exogenaAPI.deleteShareholder(id); load(); };

  return (
    <div className="p-3 space-y-3 bg-gray-50 dark:bg-graphite-2 rounded-lg">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Composición societaria a 31 de diciembre de {year}. Persona jurídica: llena solo razón social. Persona natural: nombre y apellido.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <select className={inputCls} value={form.document_type} onChange={(e) => setForm((f) => ({ ...f, document_type: e.target.value }))}>
          {documentTypes.map((d) => <option key={d.code} value={d.code}>{d.code} - {d.label}</option>)}
        </select>
        <input className={inputCls} placeholder="NIT/Documento" value={form.tax_id} onChange={(e) => setForm((f) => ({ ...f, tax_id: e.target.value }))} />
        <input className={inputCls} placeholder="Nombre" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
        <input className={inputCls} placeholder="Apellido" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
        <input className={`${inputCls} md:col-span-2`} placeholder="Razón social (persona jurídica)" value={form.business_name} onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))} />
        <input className={inputCls} placeholder="Dirección" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        <input className={inputCls} placeholder="Código DIVIPOLA ciudad" value={form.city_code} onChange={(e) => setForm((f) => ({ ...f, city_code: e.target.value }))} />
        <input className={inputCls} type="number" placeholder="Valor nominal" value={form.nominal_value} onChange={(e) => setForm((f) => ({ ...f, nominal_value: e.target.value }))} />
        <input className={inputCls} type="number" placeholder="Prima en colocación" value={form.premium_value} onChange={(e) => setForm((f) => ({ ...f, premium_value: e.target.value }))} />
        <input className={inputCls} type="number" step="0.000001" placeholder="% participación" value={form.participation_percentage} onChange={(e) => setForm((f) => ({ ...f, participation_percentage: e.target.value }))} />
      </div>
      <button onClick={addRow} disabled={loading} className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
        Agregar socio/accionista
      </button>
      {rows.length > 0 && (
        <table className="w-full text-xs">
          <thead><tr className="text-left text-gray-500 dark:text-gray-400">
            <th className="py-1 pr-2">Nombre/Razón social</th><th className="py-1 pr-2">NIT/CC</th><th className="py-1 pr-2">%</th><th className="py-1"></th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-200 dark:border-white/10">
                <td className="py-1 pr-2">{r.business_name || `${r.first_name || ''} ${r.last_name || ''}`.trim()}</td>
                <td className="py-1 pr-2">{r.tax_id}</td>
                <td className="py-1 pr-2">{r.participation_percentage}%</td>
                <td className="py-1"><button onClick={() => removeRow(r.id)} className="text-red-500 hover:underline">Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Dispatcher: cada formato con dataSource='manual' tiene su propio formulario
// (los atributos del XML no tienen nada en común entre 1004/1010/1011/1647).
function ManualDataPanel({ format, year, documentTypes }) {
  switch (format.code) {
    case '1004': return <Format1004Panel format={format} year={year} documentTypes={documentTypes} />;
    case '1010': return <ShareholdersPanel format={format} year={year} documentTypes={documentTypes} />;
    case '1011': return <Format1011Panel format={format} year={year} />;
    case '1647': return <Format1647Panel format={format} year={year} documentTypes={documentTypes} />;
    default: return null;
  }
}

function FormatRow({ format, year, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [readiness, setReadiness] = useState(null);
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);

  const isPending = format.dataSource === 'pending';

  const checkReadiness = async () => {
    setChecking(true);
    try {
      const res = await exogenaAPI.getReadiness(format.code, year);
      setReadiness(res.data);
    } catch {
      toast.error('Error al validar el formato');
    } finally {
      setChecking(false);
    }
  };

  const download = async () => {
    setGenerating(true);
    try {
      const response = await exogenaAPI.generate(format.code, year);
      const disposition = response.headers['content-disposition'] || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `Exogena-${format.code}-${year}.xml`;
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al generar el archivo');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded((e) => !e)} disabled={isPending} className="text-gray-400 disabled:opacity-30">
          {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">{format.code}</span>
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{format.name}</span>
          </div>
          {format.version && <span className="text-xs text-gray-400">v{format.version}</span>}
        </div>
        <StatusBadge dataSource={format.dataSource} isEnabled={format.is_enabled} />
        {!isPending && (
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={format.is_enabled}
              onChange={(e) => onToggle(format.code, e.target.checked)}
            />
            <div className="w-9 h-5 bg-gray-200 dark:bg-white/10 peer-checked:bg-blue-600 rounded-full transition-colors relative">
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
            </div>
          </label>
        )}
      </div>

      {expanded && !isPending && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-white/10 pt-3">
          {format.needsConceptMapping && <ConceptsPanel format={format} year={year} />}
          {format.dataSource === 'manual' && <ManualDataPanel format={format} year={year} documentTypes={format._documentTypes} />}

          <div className="flex items-center gap-2">
            <button onClick={checkReadiness} disabled={checking} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">
              {checking ? 'Validando...' : 'Validar'}
            </button>
            <button
              onClick={download}
              disabled={generating || (readiness && !readiness.ready)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> {generating ? 'Generando...' : 'Generar y descargar'}
            </button>
            {readiness && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{readiness.recordCount} registro(s)</span>
            )}
          </div>

          {readiness && !readiness.ready && (
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
              <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                {readiness.reason === 'faltan_conceptos_por_mapear' && (
                  <span>Faltan conceptos por mapear: {readiness.missingConcepts.join(', ')}</span>
                )}
                {readiness.reason === 'formato_no_implementado' && <span>Este formato aún no está implementado.</span>}
              </div>
            </div>
          )}
          {readiness?.skipped?.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {readiness.skipped.length} fila(s) se excluirán del archivo (dato faltante en el tercero, ej. sin NIT).
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExogenaPage() {
  const [formats, setFormats] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await exogenaAPI.getFormats();
      setFormats(res.data);
      setDocumentTypes(res.document_types);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (code, isEnabled) => {
    try {
      await exogenaAPI.toggleFormat(code, isEnabled);
      setFormats((prev) => prev.map((f) => (f.code === code ? { ...f, is_enabled: isEnabled } : f)));
    } catch {
      toast.error('Error al actualizar el formato');
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Información Exógena DIAN</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Selecciona los formatos que aplican a tu operación y genera el archivo del año gravable.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Año gravable</label>
            <input
              type="number"
              className={`${inputCls} w-24`}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : (
          <div className="space-y-2">
            {formats.map((f) => (
              <FormatRow key={f.code} format={{ ...f, _documentTypes: documentTypes }} year={year} onToggle={handleToggle} />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Cog6ToothIcon className="w-3.5 h-3.5" />
          Los formatos 1037 (litógrafos/tipógrafos) y 1034 (estados financieros consolidados de grupos) no aplican al perfil de tenants de Pitbox y no están en este catálogo.
        </p>
      </div>
    </Layout>
  );
}
