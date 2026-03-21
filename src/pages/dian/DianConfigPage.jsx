// frontend/src/pages/dian/DianConfigPage.jsx
import { useState, useEffect } from 'react';
import {
  getDianConfig, updateDianConfig,
  getDianResolutions, createDianResolution, deactivateResolution,
  testDianConnection, testDianConnectionProd, getHabilitacionStatus, sendAutoTestDocuments,
  diagnoseCert,
} from '../../api/dian';
import Layout from '../../components/layout/Layout';
import {
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  SignalIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';

/* ── Status badge ────────────────────────────────────────────────── */
const StepBadge = ({ done }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
    ${done ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
    {done
      ? <><CheckCircleIcon className="w-3 h-3" /> Completado</>
      : <><ClockIcon className="w-3 h-3" /> Pendiente</>}
  </span>
);

/* ── Field wrapper ───────────────────────────────────────────────── */
const Field = ({ label, required, children, hint }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
  </div>
);

/* ── Section card ────────────────────────────────────────────────── */
const Section = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
    <div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  </div>
);

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none";
const selectCls = inputCls;

/* ════════════════════════════════════════════════════════════════════
 * DianConfigPage
 * ════════════════════════════════════════════════════════════════════ */
export default function DianConfigPage() {
  const [tab, setTab] = useState('config');
  const [cfg, setCfg] = useState({});
  const [resolutions, setResolutions] = useState([]);
  const [habilitacion, setHabilitacion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [certDiag, setCertDiag] = useState(null);
  const [toast, setToast] = useState(null);
  const [showResForm, setShowResForm] = useState(false);
  const [resForm, setResForm] = useState({
    resolution_number: '', resolution_date: '', prefix: '',
    from_number: '', to_number: '', valid_from: '', valid_to: '',
    document_type: 'invoice', is_test: true, notes: '',
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [cfgRes, resRes, habRes] = await Promise.all([
        getDianConfig(),
        getDianResolutions(),
        getHabilitacionStatus(),
      ]);
      const raw = cfgRes.data.data || {};
      // Guardar flags de campos ya configurados antes de limpiar
      const pinSet = !!(raw.software_pin && raw.software_pin.includes('***'));
      const technicalKeySet = raw.technical_key === '[CONFIGURADO]';
      const certPasswordSet = raw.certificate_password === '[CONFIGURADO]';
      // Limpiar valores enmascarados para que no se reenvíen al guardar
      const clean = { ...raw, _pin_set: pinSet, _tech_key_set: technicalKeySet, _cert_pass_set: certPasswordSet };
      if (pinSet) clean.software_pin = '';
      if (technicalKeySet) clean.technical_key = '';
      if (clean.certificate_p12_base64 === '[CONFIGURADO]') clean.certificate_p12_base64 = '[CONFIGURADO]'; // se mantiene para indicador visual
      if (certPasswordSet) clean.certificate_password = '';
      setCfg(clean);
      setResolutions(resRes.data.data || []);
      setHabilitacion(habRes.data.data);
    } catch (e) {
      showToast('Error cargando configuración DIAN', 'error');
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // Limpiar campos enmascarados e internos antes de enviar
      const { _pin_set, _tech_key_set, _cert_pass_set, ...rest } = cfg;
      const toSend = { ...rest };
      if (toSend.software_pin === '') delete toSend.software_pin;
      if (toSend.technical_key === '') delete toSend.technical_key;
      if (toSend.certificate_password === '') delete toSend.certificate_password;
      await updateDianConfig(toSend);
      showToast('Configuración guardada exitosamente');
      await loadAll();
    } catch (e) {
      showToast(e.response?.data?.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    try {
      const r = await testDianConnection();
      showToast(r.data.message || 'Conexión exitosa con DIAN');
    } catch (e) {
      showToast(e.response?.data?.message || 'Error de conexión con DIAN', 'error');
    } finally {
      setTesting(false);
    }
  }

  async function handleTestConnectionProd() {
    setTesting(true);
    try {
      const r = await testDianConnectionProd();
      showToast(r.data.message || '✅ Producción OK');
    } catch (e) {
      const d = e.response?.data;
      const msg = d?.diagnostico ? `${d.message} — ${d.diagnostico}` : (d?.message || 'Error');
      showToast(msg, 'error');
    } finally {
      setTesting(false);
    }
  }

  async function handleCreateResolution(e) {
    e.preventDefault();
    try {
      await createDianResolution(resForm);
      showToast('Resolución creada exitosamente');
      setShowResForm(false);
      setResForm({
        resolution_number: '', resolution_date: '', prefix: '',
        from_number: '', to_number: '', valid_from: '', valid_to: '',
        document_type: 'invoice', is_test: true, notes: '',
      });
      await loadAll();
    } catch (e) {
      showToast(e.response?.data?.message || 'Error al crear resolución', 'error');
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('¿Desactivar esta resolución?')) return;
    try {
      await deactivateResolution(id);
      showToast('Resolución desactivada');
      await loadAll();
    } catch {
      showToast('Error al desactivar resolución', 'error');
    }
  }

  async function handleAutoTest(count) {
    setSendingTest(true);
    setTestResults(null);
    try {
      const r = await sendAutoTestDocuments(count);
      setTestResults(r.data.data || []);
      const allOk = (r.data.data || []).every(d => d.accepted);
      showToast(allOk
        ? `${count} documento(s) de prueba aceptados por DIAN`
        : `Documentos enviados. Revise los resultados.`,
        allOk ? 'success' : 'error');
      await loadAll();
    } catch (e) {
      showToast(e.response?.data?.message || 'Error al enviar documentos de prueba', 'error');
    } finally {
      setSendingTest(false);
    }
  }

  async function handleDiagnose() {
    setDiagnosing(true);
    setCertDiag(null);
    try {
      const r = await diagnoseCert();
      setCertDiag(r.data.data);
    } catch (e) {
      setCertDiag({ error: e.response?.data?.message || 'Error al diagnosticar certificado' });
    } finally {
      setDiagnosing(false);
    }
  }

  const tabs = [
    { key: 'config',      label: 'Configuración', Icon: Cog6ToothIcon },
    { key: 'resolutions', label: 'Resoluciones',  Icon: ClipboardDocumentListIcon },
    { key: 'habilitacion',label: 'Habilitación',  Icon: RocketLaunchIcon },
  ];

  return (
    <Layout>
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación Electrónica DIAN</h1>
          <p className="text-gray-500 mt-1">Configure la integración con los servicios web de la DIAN</p>
        </div>
        {habilitacion && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium
            ${habilitacion.current_environment === 'production'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'}`}>
            {habilitacion.current_environment === 'production' ? 'Producción' : 'Habilitación/Pruebas'}
          </span>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5
                ${tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.Icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── TAB: Configuración ─────────────────────────────────────── */}
      {tab === 'config' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Section title="Datos del Emisor" subtitle="Información del contribuyente facturador">
            <Field label="NIT (sin dígito verificación)" required>
              <input className={inputCls} value={cfg.nit || ''} placeholder="890901234"
                onChange={e => setCfg(p => ({ ...p, nit: e.target.value }))} />
            </Field>
            <Field label="Dígito de Verificación" required>
              <input className={inputCls} value={cfg.dv || ''} placeholder="5" maxLength={1}
                onChange={e => setCfg(p => ({ ...p, dv: e.target.value }))} />
            </Field>
            <Field label="Razón Social" required>
              <input className={inputCls} value={cfg.company_name || ''} placeholder="Mi Empresa S.A.S."
                onChange={e => setCfg(p => ({ ...p, company_name: e.target.value }))} />
            </Field>
            <Field label="Nombre Comercial">
              <input className={inputCls} value={cfg.trade_name || ''} placeholder="Nombre comercial"
                onChange={e => setCfg(p => ({ ...p, trade_name: e.target.value }))} />
            </Field>
            <Field label="Dirección">
              <input className={inputCls} value={cfg.address || ''} placeholder="Calle 123 # 45-67"
                onChange={e => setCfg(p => ({ ...p, address: e.target.value }))} />
            </Field>
            <Field label="Ciudad">
              <input className={inputCls} value={cfg.city || ''} placeholder="Bogotá D.C."
                onChange={e => setCfg(p => ({ ...p, city: e.target.value }))} />
            </Field>
            <Field label="Código DIVIPOLA Ciudad"
              hint="Código municipal DANE (ej: 11001 para Bogotá)">
              <input className={inputCls} value={cfg.city_code || ''} placeholder="11001"
                onChange={e => setCfg(p => ({ ...p, city_code: e.target.value }))} />
            </Field>
            <Field label="Departamento">
              <input className={inputCls} value={cfg.dept || ''} placeholder="Cundinamarca"
                onChange={e => setCfg(p => ({ ...p, dept: e.target.value }))} />
            </Field>
            <Field label="Régimen Tributario">
              <select className={selectCls} value={cfg.regime_code || '48'}
                onChange={e => setCfg(p => ({ ...p, regime_code: e.target.value }))}>
                <option value="48">48 - Responsable de IVA</option>
                <option value="49">49 - No responsable de IVA</option>
              </select>
            </Field>
            <Field label="Responsabilidad Fiscal"
              hint="Código de responsabilidad (ej: R-99-PN)">
              <input className={inputCls} value={cfg.tax_level_code || 'R-99-PN'}
                placeholder="R-99-PN"
                onChange={e => setCfg(p => ({ ...p, tax_level_code: e.target.value }))} />
            </Field>
          </Section>

          <Section title="Software Facturador"
            subtitle="Credenciales del software registrado ante la DIAN como software propio">
            <Field label="Software ID (UUID)" required
              hint="UUID del software registrado en el portal DIAN">
              <input className={inputCls} value={cfg.software_id || ''}
                placeholder="56f2ae4e-9812-4fad-9255-08fcfcd5ccb0"
                onChange={e => setCfg(p => ({ ...p, software_id: e.target.value }))} />
            </Field>
            <Field label="PIN del Software" required
              hint="PIN suministrado por la DIAN al registrar el software">
              <input type="password" className={inputCls} value={cfg.software_pin || ''}
                placeholder={cfg._pin_set ? "••••• (ya configurado — dejar vacío para no cambiar)" : "PIN del software"}
                onChange={e => setCfg(p => ({ ...p, software_pin: e.target.value }))} />
            </Field>
            <Field label="NIT del Proveedor Tecnológico" required
              hint="Su propio NIT como software propio (= NIT del emisor)">
              <input className={inputCls} value={cfg.software_provider_nit || ''}
                placeholder="890901234"
                onChange={e => setCfg(p => ({ ...p, software_provider_nit: e.target.value }))} />
            </Field>
            <Field label="Llave Técnica (Technical Key)" required
              hint="Clave técnica suministrada por la DIAN para calcular el CUFE">
              <input type="password" className={inputCls} value={cfg.technical_key || ''}
                placeholder={cfg._tech_key_set ? "Ya configurado — dejar vacío para no cambiar" : "Clave técnica DIAN"}
                onChange={e => setCfg(p => ({ ...p, technical_key: e.target.value }))} />
            </Field>
            <Field label="Entorno" required>
              <select className={selectCls} value={cfg.environment || 'test'}
                onChange={e => setCfg(p => ({ ...p, environment: e.target.value }))}>
                <option value="test">Habilitación / Pruebas</option>
                <option value="production">Producción</option>
              </select>
            </Field>
            <Field label="TestSetId" hint="ID del set de pruebas — se obtiene en el portal DIAN de habilitación">
              <input className={inputCls} value={cfg.test_set_id || ''}
                placeholder="ID del set de pruebas"
                onChange={e => setCfg(p => ({ ...p, test_set_id: e.target.value }))} />
            </Field>
          </Section>

          <Section title="Certificado Digital"
            subtitle="Certificado P12/PFX expedido por entidad certificadora habilitada por la DIAN">
            <div className="md:col-span-2">
              <Field label="Certificado P12 (Base64)"
                hint="Pegue aquí el contenido del certificado .p12 codificado en Base64, o use el botón de carga">
                <div className="space-y-2">
                  <input type="file" accept=".p12,.pfx" className="block text-sm text-gray-500
                    file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0
                    file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => {
                        const b64 = ev.target.result.split(',')[1];
                        setCfg(p => ({ ...p, certificate_p12_base64: b64 }));
                      };
                      reader.readAsDataURL(file);
                    }} />
                  {cfg.certificate_p12_base64 && (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ {cfg.certificate_p12_base64 === '[CONFIGURADO]'
                        ? 'Certificado configurado (guardado)'
                        : 'Certificado cargado (pendiente de guardar)'}
                    </p>
                  )}
                </div>
              </Field>
            </div>
            <Field label="Contraseña del Certificado">
              <input type="password" className={inputCls} value={cfg.certificate_password || ''}
                placeholder={cfg._cert_pass_set ? "Ya configurado — dejar vacío para no cambiar" : "Contraseña del P12"}
                onChange={e => setCfg(p => ({ ...p, certificate_password: e.target.value }))} />
            </Field>
          </Section>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={handleTestConnection} disabled={testing}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium
                text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {testing
                ? <><ArrowPathIcon className="w-4 h-4 inline mr-1 animate-spin" />Probando...</>
                : <><SignalIcon className="w-4 h-4 inline mr-1" />Probar Conexión DIAN</>}
            </button>
            <button type="button" onClick={handleTestConnectionProd} disabled={testing}
              className="px-4 py-2 border border-orange-400 rounded-lg text-sm font-medium
                text-orange-700 hover:bg-orange-50 disabled:opacity-50 transition-colors">
              {testing
                ? <><ArrowPathIcon className="w-4 h-4 inline mr-1 animate-spin" />Probando...</>
                : <><SignalIcon className="w-4 h-4 inline mr-1" />Probar Producción (diagnóstico)</>}
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
                hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      )}

      {/* ── TAB: Resoluciones ────────────────────────────────────────── */}
      {tab === 'resolutions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                Registre la resolución de facturación otorgada por la DIAN. El consecutivo
                de las facturas electrónicas se tomará de aquí.
              </p>
            </div>
            <button onClick={() => setShowResForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + Nueva Resolución
            </button>
          </div>

          {/* Formulario nueva resolución */}
          {showResForm && (
            <form onSubmit={handleCreateResolution}
              className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
              <h4 className="font-semibold text-gray-900">Nueva Resolución DIAN</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Número de Resolución" required>
                  <input className={inputCls} required value={resForm.resolution_number}
                    placeholder="18760000001"
                    onChange={e => setResForm(p => ({ ...p, resolution_number: e.target.value }))} />
                </Field>
                <Field label="Fecha Resolución" required>
                  <input type="date" className={inputCls} required value={resForm.resolution_date}
                    onChange={e => setResForm(p => ({ ...p, resolution_date: e.target.value }))} />
                </Field>
                <Field label="Prefijo" required>
                  <input className={inputCls} required value={resForm.prefix}
                    placeholder="SETP" maxLength={10}
                    onChange={e => setResForm(p => ({ ...p, prefix: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Desde" required>
                  <input type="number" className={inputCls} required value={resForm.from_number}
                    placeholder="990000000"
                    onChange={e => setResForm(p => ({ ...p, from_number: e.target.value }))} />
                </Field>
                <Field label="Hasta" required>
                  <input type="number" className={inputCls} required value={resForm.to_number}
                    placeholder="995000000"
                    onChange={e => setResForm(p => ({ ...p, to_number: e.target.value }))} />
                </Field>
                <Field label="Tipo de Resolución">
                  <select className={selectCls} value={resForm.is_test}
                    onChange={e => setResForm(p => ({ ...p, is_test: e.target.value === 'true' }))}>
                    <option value="true">Habilitación / Pruebas</option>
                    <option value="false">Producción</option>
                  </select>
                </Field>
                <Field label="Válida Desde" required>
                  <input type="date" className={inputCls} required value={resForm.valid_from}
                    onChange={e => setResForm(p => ({ ...p, valid_from: e.target.value }))} />
                </Field>
                <Field label="Válida Hasta" required>
                  <input type="date" className={inputCls} required value={resForm.valid_to}
                    onChange={e => setResForm(p => ({ ...p, valid_to: e.target.value }))} />
                </Field>
                <Field label="Notas">
                  <input className={inputCls} value={resForm.notes}
                    placeholder="Notas opcionales"
                    onChange={e => setResForm(p => ({ ...p, notes: e.target.value }))} />
                </Field>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowResForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Guardar Resolución
                </button>
              </div>
            </form>
          )}

          {/* Lista de resoluciones */}
          {resolutions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <InboxIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No hay resoluciones registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resolutions.map(r => (
                <div key={r.id} className={`rounded-xl border p-4 flex items-start justify-between
                  ${r.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">Res. {r.resolution_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${r.is_test ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {r.is_test ? 'Habilitación' : 'Producción'}
                      </span>
                      {!r.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Prefijo: <strong>{r.prefix}</strong> &nbsp;|&nbsp;
                      Rango: {r.from_number.toLocaleString()} – {r.to_number.toLocaleString()} &nbsp;|&nbsp;
                      Consecutivo actual: <strong className="text-blue-700">{r.current_number}</strong>
                    </p>
                    <p className="text-xs text-gray-400">
                      Vigencia: {r.valid_from} al {r.valid_to}
                    </p>
                  </div>
                  {r.is_active && (
                    <button onClick={() => handleDeactivate(r.id)}
                      className="text-sm text-red-600 hover:text-red-800 ml-4 flex-shrink-0">
                      Desactivar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Habilitación ──────────────────────────────────────── */}
      {tab === 'habilitacion' && habilitacion && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
              <RocketLaunchIcon className="w-5 h-5" /> Proceso de Habilitación ante la DIAN
            </h3>
            <p className="text-sm text-blue-700">
              Para operar como software propio de facturación electrónica, debe completar los
              siguientes pasos y enviar al menos <strong>2 documentos de prueba</strong> de cada tipo
              al set de habilitación de la DIAN.
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            {habilitacion.steps.map((step, i) => (
              <div key={step.key}
                className={`flex items-start gap-4 p-4 rounded-xl border
                  ${step.done
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold
                  ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {step.done ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium ${step.done ? 'text-green-800' : 'text-gray-800'}`}>
                      {step.label}
                    </p>
                    <StepBadge done={step.done} />
                  </div>
                  {step.details && (
                    <p className="text-xs text-gray-500 mt-0.5">{step.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Panel diagnóstico de certificado P12 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-500" /> Diagnóstico del certificado P12
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Verifica que el certificado, la clave privada y el NIT estén correctamente configurados.
                  Si aparece <strong>InvalidSecurity</strong> en los envíos, ejecuta este diagnóstico primero.
                </p>
              </div>
              <button
                onClick={handleDiagnose}
                disabled={diagnosing}
                className="flex-shrink-0 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium
                  hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-2">
                {diagnosing
                  ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Analizando...</>
                  : <><MagnifyingGlassIcon className="w-4 h-4" /> Diagnosticar certificado</>}
              </button>
            </div>

            {certDiag && !certDiag.error && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                {/* Issues banner */}
                {certDiag.issues?.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-red-800 uppercase tracking-wide">Problemas detectados</p>
                    {certDiag.issues.map((issue, i) => (
                      <p key={i} className="text-sm text-red-700">{issue}</p>
                    ))}
                  </div>
                )}
                {certDiag.issues?.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <p className="text-sm text-green-800 font-medium">
                      Certificado OK — clave, NIT y vigencia verificados correctamente.
                    </p>
                  </div>
                )}
                {/* Details grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'CN (empresa)', value: certDiag.cn },
                    { label: 'NIT certificado', value: certDiag.nit_cert, highlight: !certDiag.nit_match ? 'red' : 'green' },
                    { label: 'NIT configurado', value: certDiag.nit_config, highlight: !certDiag.nit_match ? 'red' : 'green' },
                    { label: 'Clave ↔ Cert', value: certDiag.key_cert_match ? '✅ Coinciden' : '❌ No coinciden', highlight: certDiag.key_cert_match ? 'green' : 'red' },
                    { label: 'Válido desde', value: certDiag.not_before ? new Date(certDiag.not_before).toLocaleDateString('es-CO') : '?' },
                    { label: 'Vence', value: certDiag.not_after ? new Date(certDiag.not_after).toLocaleDateString('es-CO') : '?', highlight: certDiag.is_expired ? 'red' : 'green' },
                    { label: 'Días restantes', value: certDiag.is_expired ? 'VENCIDO' : `${certDiag.days_remaining} días`, highlight: certDiag.is_expired ? 'red' : certDiag.days_remaining < 30 ? 'yellow' : 'green' },
                    { label: 'Software ID', value: certDiag.software_id },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="bg-gray-50 rounded p-2">
                      <p className="text-gray-400 mb-0.5">{label}</p>
                      <p className={`font-mono font-medium text-xs break-all
                        ${highlight === 'red' ? 'text-red-700' :
                          highlight === 'green' ? 'text-green-700' :
                          highlight === 'yellow' ? 'text-amber-700' : 'text-gray-800'}`}>
                        {value || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {certDiag?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium">Error: {certDiag.error}</p>
              </div>
            )}
          </div>

          {/* Panel de envío automático de documentos de prueba */}
          {!habilitacion.all_complete && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ArrowUpTrayIcon className="w-4 h-4 text-gray-500" /> Enviar documentos de prueba automáticamente
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Genera y envía facturas sintéticas válidas al set de pruebas DIAN sin necesidad
                  de crear ventas reales. Requiere tener configurados: NIT, Software ID, Llave Técnica,
                  TestSetId y una resolución de habilitación activa.
                </p>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => handleAutoTest(1)}
                  disabled={sendingTest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
                    hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {sendingTest
                    ? <><ClockIcon className="w-4 h-4 animate-pulse" /> Enviando y esperando respuesta DIAN...</>
                    : <><DocumentTextIcon className="w-4 h-4" /> Enviar 1 documento de prueba</>}
                </button>
                <button
                  onClick={() => handleAutoTest(2)}
                  disabled={sendingTest}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium
                    hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {sendingTest
                    ? <><ClockIcon className="w-4 h-4 animate-pulse" /> Enviando y esperando respuesta DIAN...</>
                    : <><DocumentTextIcon className="w-4 h-4" /> Enviar 2 documentos (recomendado)</>}
                </button>
              </div>
              {sendingTest && (
                <p className="text-xs text-gray-500 italic">
                  La DIAN procesa de forma asíncrona — esto puede tardar hasta 60 segundos...
                </p>
              )}

              {/* Resultados */}
              {testResults && testResults.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resultados del envío</p>
                  {testResults.map((r, idx) => (
                    <div key={idx} className={`rounded-lg p-3 text-sm
                      ${r.accepted ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-start gap-3">
                        {r.accepted
                          ? <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          : <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${r.accepted ? 'text-green-800' : 'text-red-800'}`}>
                            Documento {r.index}: {r.invoiceNumber || 'Error al generar'}
                          </p>
                          {r.accepted && r.cufe && (
                            <p className="text-xs text-green-600 font-mono mt-0.5">
                              CUFE: {r.cufe?.substring(0, 32)}...
                            </p>
                          )}
                          {!r.accepted && (
                            <div className="mt-1 space-y-0.5">
                              {r.error && <p className="text-xs text-red-700 font-medium">{r.error}</p>}
                              {r.statusCode && <p className="text-xs text-red-600">Código: <strong>{r.statusCode}</strong></p>}
                              {r.statusDescription && <p className="text-xs text-red-600">Descripción: {r.statusDescription}</p>}
                              {r.statusMessage && r.statusMessage !== r.statusDescription && (
                                <p className="text-xs text-red-600">Mensaje: {r.statusMessage}</p>
                              )}
                              {!r.error && !r.statusCode && !r.statusDescription && !r.statusMessage && (
                                <p className="text-xs text-red-600">Rechazado por la DIAN — verifique NIT, Llave Técnica y certificado</p>
                              )}
                            </div>
                          )}
                          {/* Raw DIAN response (debug) */}
                          {!r.accepted && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-500 cursor-pointer hover:text-blue-700 font-medium">
                                <MagnifyingGlassIcon className="w-3 h-3 inline mr-1" />Ver respuesta DIAN (debug)
                              </summary>
                              <pre className="text-xs text-gray-500 bg-gray-900 text-green-400 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-all max-h-60">
                                {r.rawPreview || r.error || 'Sin respuesta del servidor DIAN'}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {habilitacion.all_complete ? (
            <div className="bg-green-100 border border-green-300 rounded-xl p-5 text-center">
              <CheckCircleIcon className="w-10 h-10 mx-auto mb-2 text-green-500" />
              <p className="font-semibold text-green-900">
                ¡Proceso de habilitación completado!
              </p>
              <p className="text-sm text-green-700 mt-1">
                Puede cambiar el entorno a <strong>Producción</strong> en la pestaña de Configuración.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800">
                <strong>Pasos pendientes:</strong> Complete la configuración de los campos marcados
                arriba, luego use el botón de envío automático para completar las pruebas requeridas por la DIAN.
              </p>
            </div>
          )}

          {/* Instrucciones */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-gray-900">📖 Guía de Habilitación como Software Propio</h4>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Ingrese al <a href="https://catalogo-vpfe-hab.dian.gov.co" target="_blank" rel="noreferrer"
                className="text-blue-600 underline">Portal Habilitación DIAN</a> con su firma electrónica</li>
              <li>En <strong>Software de Facturación</strong> registre su software como <em>software propio</em></li>
              <li>Obtenga el <strong>Software ID</strong>, <strong>PIN</strong> y <strong>Llave Técnica</strong></li>
              <li>En <strong>Set de Pruebas</strong> obtenga el <strong>TestSetId</strong></li>
              <li>Configure los datos en esta página y cargue el certificado digital</li>
              <li>Registre la resolución de habilitación (la DIAN la otorga con prefijo SETP)</li>
              <li>Use el botón <strong>"Enviar 2 documentos de prueba"</strong> arriba para completar la habilitación</li>
              <li>Una vez aprobados, cambie el entorno a <strong>Producción</strong></li>
            </ol>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}