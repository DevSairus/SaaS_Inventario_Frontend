// frontend/src/pages/settings/WhatsAppSettingsPage.jsx
import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';
import api from '../../api/axios';
import toast from 'react-hot-toast';

function WhatsAppIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function WhatsAppSettingsPage() {
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null); // null | { success, message, diagnosis }

  const handleTestCloudinary = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.get('/whatsapp/test-cloudinary');
      setTestResult(data);
      if (data.success) toast.success('Cloudinary OK ✅');
      else toast.error('Error con Cloudinary');
    } catch (e) {
      const data = e.response?.data || { success: false, message: e.message, diagnosis: null };
      setTestResult(data);
      toast.error('Error conectando con Cloudinary');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">WhatsApp</h1>
          <p className="text-sm text-gray-500">
            Envío de facturas y órdenes de trabajo directamente a tus clientes.
          </p>
        </div>

        {/* Estado */}
        <div className="flex items-start gap-4 p-5 bg-green-50 border border-green-200 rounded-xl">
          <div className="w-3 h-3 mt-1.5 rounded-full bg-green-500 shrink-0" />
          <div>
            <p className="font-semibold text-green-800 text-sm">Activo — Modo wa.me</p>
            <p className="text-xs text-green-700 mt-0.5">
              No requiere escanear QR ni mantener sesión abierta. Compatible con Vercel y cualquier hosting serverless.
            </p>
          </div>
        </div>

        {/* Cómo funciona */}
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <WhatsAppIcon className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-800 text-sm">Facturas y Órdenes de Trabajo</h2>
          </div>
          <ol className="text-sm text-gray-600 space-y-3 list-decimal list-inside">
            <li>Abre una venta o una orden de trabajo y haz clic en <strong>Enviar por WhatsApp</strong>.</li>
            <li>El sistema prepara el mensaje con los datos del documento (y el PDF si Cloudinary está activo).</li>
            <li>Se abre WhatsApp Web o la app con el mensaje listo. Solo presiona <strong className="text-green-700">Enviar ↑</strong>.</li>
          </ol>
          <p className="text-xs text-gray-400 mt-4">
            * El mensaje se envía desde <strong>tu propio WhatsApp</strong>.
          </p>
        </div>

        {/* Cloudinary — PDF */}
        <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">PDF adjunto — Cloudinary</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Sube el PDF a la nube y envía el enlace de descarga por WhatsApp.
              </p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0">Opcional</span>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 space-y-1">
            <p>CLOUDINARY_CLOUD_NAME=<span className="text-blue-600">tu_cloud_name</span></p>
            <p>CLOUDINARY_API_KEY=<span className="text-blue-600">tu_api_key</span></p>
            <p>CLOUDINARY_API_SECRET=<span className="text-blue-600">tu_api_secret</span></p>
          </div>

          <p className="text-xs text-gray-400">
            Sin estas variables el botón funciona igual pero envía un resumen de texto en lugar del PDF.
            Crea tu cuenta gratis en{' '}
            <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              cloudinary.com
            </a>
            {' '}(plan gratuito: 25 GB).
          </p>

          {/* Botón de prueba */}
          <div className="pt-1">
            <button
              onClick={handleTestCloudinary}
              disabled={testing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {testing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Probando conexión...
                </>
              ) : '🔌 Probar conexión con Cloudinary'}
            </button>
          </div>

          {/* Resultado del test */}
          {testResult && (
            <div className={`rounded-lg border p-4 space-y-3 text-xs ${
              testResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success
                  ? <CheckIcon className="w-4 h-4 text-green-600" />
                  : <XIcon className="w-4 h-4 text-red-600" />
                }
                <span className={`font-semibold ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {testResult.message}
                </span>
              </div>

              {testResult.diagnosis && (
                <div className="space-y-1 font-mono text-gray-600">
                  <p className="font-sans font-medium text-gray-700 mb-1">Variables de entorno:</p>
                  {Object.entries(testResult.diagnosis.env || {}).map(([key, val]) => (
                    key !== 'cloud_name_value' && (
                      <div key={key} className="flex items-center gap-2">
                        {val
                          ? <CheckIcon className="w-3 h-3 text-green-500 shrink-0" />
                          : <XIcon className="w-3 h-3 text-red-500 shrink-0" />
                        }
                        <span className={val ? 'text-green-700' : 'text-red-700'}>{key}</span>
                      </div>
                    )
                  ))}
                  {testResult.diagnosis.env?.cloud_name_value && (
                    <p className="text-gray-500 mt-1">
                      Cloud name: <span className="text-gray-800">{testResult.diagnosis.env.cloud_name_value}</span>
                    </p>
                  )}
                  {testResult.diagnosis.upload && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="font-sans text-green-700">✅ Archivo de prueba subido y eliminado correctamente.</p>
                      <p className="text-gray-500 mt-0.5 break-all">URL: {testResult.diagnosis.upload.secure_url}</p>
                    </div>
                  )}
                  {testResult.diagnosis.error && (
                    <p className="mt-2 text-red-700 font-sans">Error: {testResult.diagnosis.error}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recordatorios */}
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <h2 className="font-semibold text-gray-800 text-sm mb-1">Recordatorios automáticos (SOAT / Tecno)</h2>
          <p className="text-xs text-gray-500">
            Los recordatorios se envían por <strong>email</strong> automáticamente 15, 7 y 3 días antes del vencimiento.
            Requiere <code className="bg-gray-100 px-1 rounded">GMAIL_USER</code> y{' '}
            <code className="bg-gray-100 px-1 rounded">GMAIL_APP_PASSWORD</code> en las variables de entorno.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Integración con WhatsApp para recordatorios automáticos disponible próximamente (Meta Cloud API).
          </p>
        </div>

      </div>
    </Layout>
  );
}