// frontend/src/pages/payroll/PayrollDocumentDetailPage.jsx
//
// Detalle de un Documento Soporte de Pago de Nómina: resumen de la
// liquidación (devengados/deducciones), estado DIAN, descargas, historial
// de Notas de Ajuste, y el botón para crear una nueva — solo habilitado
// cuando dian_status === 'accepted' && cune, espejo exacto de la validación
// en createPayrollDocumentAdjustment (backend).
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePayrollDocumentsStore } from '../../store/payrollDocumentsStore';
import Layout from '../../components/layout/Layout';
import PayrollAdjustmentModal from '../../components/payroll/PayrollAdjustmentModal';
import { DIAN_DOCUMENT_STATUSES, ADJUSTMENT_TYPES } from '../../constants/payroll';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const DIAN_BADGE_STYLES = {
  gray: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

const dianStatusInfo = (value) => DIAN_DOCUMENT_STATUSES.find((s) => s.value === value) || { label: value || 'pending', color: 'gray' };
const adjustmentTypeLabel = (value) => ADJUSTMENT_TYPES.find((t) => t.value === value)?.label || value;

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCurrencyCOP = (value) =>
  Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const PayrollDocumentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    document: doc, isLoading,
    fetchDocumentById, clearDocument, downloadXml, downloadPdf,
  } = usePayrollDocumentsStore();

  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchDocumentById(id);
    return () => clearDocument();
  }, [id]);

  const handleAdjustmentClosed = () => {
    setIsAdjustmentModalOpen(false);
    // createAdjustment ya refresca el documento internamente (ver
    // payrollDocumentsStore.js), no hace falta volver a pedirlo aquí.
  };

  if (isLoading && !doc) {
    return (
      <Layout>
        <div className="flex items-center justify-center gap-3 py-24 text-gray-400">
          <ArrowPathIcon className="h-6 w-6 animate-spin" />
          <span className="text-sm">Cargando documento...</span>
        </div>
      </Layout>
    );
  }

  if (!doc) {
    return (
      <Layout>
        <div className="py-24 text-center text-gray-400">
          <p className="text-sm">Documento no encontrado</p>
          <Link to="/payroll/documents" className="mt-2 inline-block text-blue-600 text-sm hover:underline">
            Volver a documentos
          </Link>
        </div>
      </Layout>
    );
  }

  const info = dianStatusInfo(doc.dian_status);
  const empName = doc.employee ? [doc.employee.first_name, doc.employee.first_surname].filter(Boolean).join(' ') : '—';
  const canAdjust = doc.dian_status === 'accepted' && !!doc.cune;
  const adjustments = doc.adjustments || [];

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/payroll/documents')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 mb-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Documentos
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{empName}</h1>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${DIAN_BADGE_STYLES[info.color] || DIAN_BADGE_STYLES.gray}`}>
                  {info.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500 font-mono">
                {doc.payroll_document_number || 'Sin número'}
                {doc.period && <> · Periodo: {formatDate(doc.period.start_date)} – {formatDate(doc.period.end_date)}</>}
              </p>
              {doc.dian_error_message && (
                <p className="text-sm text-red-500 mt-1">{doc.dian_error_message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => downloadXml(doc.id, `${doc.payroll_document_number || doc.id}.xml`)}
                disabled={!doc.xml_content}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                XML
              </button>
              <button
                onClick={() => downloadPdf(doc.id, `${doc.payroll_document_number || doc.id}.pdf`)}
                disabled={!doc.xml_content}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </button>
              <button
                onClick={() => setIsAdjustmentModalOpen(true)}
                disabled={!canAdjust}
                title={canAdjust ? 'Crear Nota de Ajuste' : 'El documento debe estar aceptado por la DIAN (con CUNE) para poder ajustarlo'}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PlusIcon className="h-4 w-4" />
                Nota de Ajuste
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Resumen de liquidación */}
          <div className="lg:col-span-2 bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
              <DocumentTextIcon className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Resumen de liquidación</h2>
            </div>

            {!doc.resumen ? (
              <div className="py-10 text-center text-gray-400 text-sm">Sin liquidación asociada</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-white/10">
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Devengados</p>
                  <div className="space-y-1.5">
                    {doc.resumen.devengadosLines?.length ? doc.resumen.devengadosLines.map((line, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{line.label}</span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{formatCurrencyCOP(line.amount)}</span>
                      </div>
                    )) : <p className="text-sm text-gray-400">Sin devengados</p>}
                  </div>
                  <div className="flex justify-between text-sm mt-3 pt-2 border-t border-gray-100 dark:border-white/10 font-semibold">
                    <span className="text-gray-700 dark:text-gray-300">Total devengado</span>
                    <span className="text-gray-900 dark:text-gray-100">{formatCurrencyCOP(doc.devengados_total)}</span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Deducciones</p>
                  <div className="space-y-1.5">
                    {doc.resumen.deduccionesLines?.length ? doc.resumen.deduccionesLines.map((line, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{line.label}</span>
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{formatCurrencyCOP(line.amount)}</span>
                      </div>
                    )) : <p className="text-sm text-gray-400">Sin deducciones</p>}
                  </div>
                  <div className="flex justify-between text-sm mt-3 pt-2 border-t border-gray-100 dark:border-white/10 font-semibold">
                    <span className="text-gray-700 dark:text-gray-300">Total deducciones</span>
                    <span className="text-gray-900 dark:text-gray-100">{formatCurrencyCOP(doc.deducciones_total)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="px-4 py-3 bg-gray-50 dark:bg-graphite-2 border-t border-gray-100 dark:border-white/10 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Neto de pago</span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrencyCOP(doc.comprobante_total)}</span>
            </div>
          </div>

          {/* Datos DIAN */}
          <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Datos DIAN</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-gray-500">CUNE</dt>
                <dd className="text-gray-800 dark:text-gray-200 font-mono text-xs text-right break-all">{doc.cune || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-gray-500">Enviado</dt>
                <dd className="text-gray-800 dark:text-gray-200">{formatDateTime(doc.dian_sent_at)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-gray-500">Aceptado</dt>
                <dd className="text-gray-800 dark:text-gray-200">{formatDateTime(doc.dian_accepted_at)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Notas de Ajuste */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notas de Ajuste</h2>
          </div>

          {adjustments.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No se han creado notas de ajuste para este documento</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-graphite-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-2 text-left">Fecha</th>
                    <th className="px-4 py-2 text-left">Tipo</th>
                    <th className="px-4 py-2 text-left">Motivo</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-center">Estado DIAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {adjustments
                    .slice()
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .map((adj) => {
                      const adjInfo = dianStatusInfo(adj.dian_status);
                      return (
                        <tr key={adj.id}>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{formatDateTime(adj.created_at)}</td>
                          <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{adjustmentTypeLabel(adj.adjustment_type)}</td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 max-w-xs truncate" title={adj.reason}>{adj.reason || '—'}</td>
                          <td className="px-4 py-2.5 text-right text-gray-800 dark:text-gray-200">{formatCurrencyCOP(adj.comprobante_total)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${DIAN_BADGE_STYLES[adjInfo.color] || DIAN_BADGE_STYLES.gray}`}>
                              {adjInfo.label}
                            </span>
                            {adj.dian_error_message && (
                              <p className="text-xs text-red-500 mt-1 max-w-xs">{adj.dian_error_message}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isAdjustmentModalOpen && (
        <PayrollAdjustmentModal
          isOpen={isAdjustmentModalOpen}
          payrollDocumentId={doc.id}
          onClose={handleAdjustmentClosed}
        />
      )}
    </Layout>
  );
};

export default PayrollDocumentDetailPage;
