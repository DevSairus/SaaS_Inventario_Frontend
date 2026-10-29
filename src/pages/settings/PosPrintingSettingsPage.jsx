// frontend/src/pages/settings/PosPrintingSettingsPage.jsx
// Ajustes → Impresión POS. La configuración es de ESTE equipo (localStorage,
// utils/posPrinting.js): si tiene impresora de tirilla, de qué ancho y qué
// imprime solo. Cualquier usuario la puede cambiar en su computador.
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Printer, Monitor, Zap, Copy, CheckCircle2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import useAuthStore from '../../store/authStore';
import {
  PAPER_WIDTHS, FONT_SIZES, SAMPLE_TICKET, getPosSettings, savePosSettings, renderTicketHtml, printTicket,
} from '../../utils/posPrinting';

function Check({ label, checked, onChange, disabled, help }) {
  return (
    <label className={`flex items-start gap-2 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input type="checkbox" className="mt-0.5 accent-blue-600" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {label}
        {help && <span className="block text-xs text-gray-500 dark:text-gray-500">{help}</span>}
      </span>
    </label>
  );
}

function Segmented({ options, value, onChange, disabled }) {
  return (
    <div className={`inline-flex rounded-lg border border-gray-200 dark:border-white/10 p-1 bg-white dark:bg-graphite ${disabled ? 'opacity-60' : ''}`}>
      {options.map(([key, label]) => (
        <button key={key} type="button" disabled={disabled} onClick={() => onChange(key)}
          className={`px-3 py-1.5 text-sm rounded-md ${String(value) === String(key) ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function CopyLine({ value }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copiado');
    } catch {
      toast.error('No se pudo copiar; selecciona el texto y cópialo a mano');
    }
  };
  return (
    <div className="flex items-stretch gap-2">
      <code className="flex-1 min-w-0 px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-200 break-all select-all">
        {value}
      </code>
      <button type="button" onClick={copy}
        className="shrink-0 inline-flex items-center gap-1 px-3 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
        <Copy size={14} /> Copiar
      </button>
    </div>
  );
}

const Card = ({ icon: Icon, title, children }) => (
  <section className="bg-white dark:bg-graphite border border-gray-200 dark:border-white/10 rounded-xl p-5 space-y-4">
    <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
      <Icon size={18} className="text-blue-600" /> {title}
    </h2>
    {children}
  </section>
);

export default function PosPrintingSettingsPage() {
  const tenantId = useAuthStore((s) => s.user?.tenant_id);
  const [settings, setSettings] = useState(() => getPosSettings(tenantId));
  const [printing, setPrinting] = useState(false);

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    savePosSettings(tenantId, next);
  };

  const previewHtml = useMemo(() => renderTicketHtml(SAMPLE_TICKET, { ...settings, copies: 1 }), [settings]);
  const previewWidthPx = Math.round((PAPER_WIDTHS[settings.paper] || PAPER_WIDTHS[80]).width * 96 / 25.4);

  const testPrint = async () => {
    setPrinting(true);
    try {
      await printTicket(SAMPLE_TICKET, { ...settings, copies: 1 });
    } finally {
      setPrinting(false);
    }
  };

  const appUrl = window.location.origin;
  const chromeTarget = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app=${appUrl}`;
  const edgeTarget = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --app=${appUrl}`;
  const off = !settings.enabled;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5 max-w-6xl">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Impresión POS (tirilla)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
            Imprime facturas, remisiones, recibos de pago y cierres de caja en impresora de tirilla. Esta configuración es solo de
            <strong> este equipo</strong>: hazla en cada computador que tenga una impresora POS conectada. Se guarda sola.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            <Card icon={Printer} title="Impresora de este equipo">
              <Check
                label="Este equipo tiene impresora POS"
                help="Activa la tirilla en este computador: botones Imprimir tirilla y la impresión automática."
                checked={settings.enabled}
                onChange={(v) => update({ enabled: v })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ancho del papel</span>
                  <Segmented disabled={off} value={settings.paper} onChange={(v) => update({ paper: Number(v) })}
                    options={Object.entries(PAPER_WIDTHS).map(([k, p]) => [k, p.label])} />
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tamaño de letra</span>
                  <Segmented disabled={off} value={settings.font} onChange={(v) => update({ font: v })}
                    options={Object.entries(FONT_SIZES).map(([k, f]) => [k, f.label])} />
                </div>
                <label className="block">
                  <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Copias</span>
                  <select disabled={off} value={settings.copies} onChange={(e) => update({ copies: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-white/10 rounded-lg dark:bg-graphite-2 dark:text-gray-100 disabled:opacity-60">
                    {[1, 2, 3].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Papel en blanco al final</span>
                  <select disabled={off} value={settings.feed_mm} onChange={(e) => update({ feed_mm: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-white/10 rounded-lg dark:bg-graphite-2 dark:text-gray-100 disabled:opacity-60">
                    {[0, 4, 8, 12, 20].map((mm) => <option key={mm} value={mm}>{mm} mm</option>)}
                  </select>
                  <span className="block text-xs text-gray-500 mt-0.5">Súbelo si la impresora corta encima del último renglón.</span>
                </label>
              </div>
              <Check label="Imprimir el logo de la empresa" disabled={off} checked={settings.print_logo} onChange={(v) => update({ print_logo: v })} />
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={testPrint} disabled={off || printing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  <Printer size={16} /> {printing ? 'Imprimiendo...' : 'Imprimir prueba'}
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-500">Las marcas IZQUIERDA y DERECHA del final deben salir completas. Si se cortan, revisa el ancho del papel.</span>
              </div>
            </Card>

            <Card icon={Zap} title="Imprimir automáticamente">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Con estas opciones, la tirilla sale sola sin buscar ningún botón. Siempre puedes reimprimir desde el documento.
              </p>
              <Check disabled={off} checked={settings.auto_sale} onChange={(v) => update({ auto_sale: v })}
                label="Al confirmar una venta (factura o remisión)"
                help="La factura espera unos segundos la validación de la DIAN para salir con CUFE y código QR." />
              <Check disabled={off} checked={settings.auto_receipt} onChange={(v) => update({ auto_receipt: v })}
                label="Al registrar un pago o abono (recibo de caja)"
                help="Pagos a ventas ya confirmadas y abonos a órdenes de trabajo." />
              <Check disabled={off} checked={settings.auto_cash_session} onChange={(v) => update({ auto_cash_session: v })}
                label="Al cerrar la caja (cierre de caja)" />
            </Card>

            <Card icon={Monitor} title="Imprimir sin que aparezca el cuadro de impresión">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Por seguridad, el navegador siempre muestra el cuadro de impresión. Para que la tirilla salga directo, abre Pitbox con un
                acceso directo especial. Se hace una sola vez por computador:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>
                  En Windows, abre <strong>Configuración → Bluetooth y dispositivos → Impresoras y escáneres</strong>, elige la impresora
                  POS y haz clic en <strong>Establecer como predeterminada</strong>. Desactiva <strong>Permitir que Windows administre la
                  impresora predeterminada</strong>.
                </li>
                <li>En el escritorio, clic derecho → <strong>Nuevo → Acceso directo</strong>.</li>
                <li>
                  En <strong>Escriba la ubicación del elemento</strong>, pega esta línea (Google Chrome):
                  <div className="mt-2"><CopyLine value={chromeTarget} /></div>
                  <span className="block text-xs text-gray-500 mt-1">Si usas Microsoft Edge:</span>
                  <div className="mt-1"><CopyLine value={edgeTarget} /></div>
                </li>
                <li>Ponle de nombre <strong>Pitbox POS</strong> y haz clic en <strong>Finalizar</strong>.</li>
                <li>
                  <strong>Cierra todas las ventanas</strong> del navegador y abre Pitbox desde ese acceso directo. Desde ahí, todo lo que se
                  imprima sale directo a la impresora POS.
                </li>
              </ol>
              <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                  En ese modo también los PDF y las etiquetas van a la impresora predeterminada. Si en el mismo equipo imprimes en otra
                  impresora, ábrelos desde el navegador normal. Para que la impresora corte el papel o abra el cajón monedero al
                  terminar, actívalo en las preferencias del controlador de la impresora (Windows → Impresora → Preferencias de impresión).
                </span>
              </div>
            </Card>
          </div>

          <div className="lg:sticky lg:top-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Vista previa</p>
            <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 overflow-x-auto">
              <iframe
                title="Vista previa de la tirilla"
                srcDoc={previewHtml}
                className="bg-white shadow-sm mx-auto block"
                style={{ width: previewWidthPx, height: 560, border: 0 }}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
