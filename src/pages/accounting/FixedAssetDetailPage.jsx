// frontend/src/pages/accounting/FixedAssetDetailPage.jsx
//
// Detalle de un Activo Fijo: datos generales, histórico de depreciación
// (FixedAssetDepreciationEntry) y valor en libros actual.
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fixedAssetsAPI, FIXED_ASSET_CATEGORY_LABELS } from '../../api/accounting';
import Layout from '../../components/layout/Layout';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const STATUS_LABELS = {
  activo: { label: 'Activo', className: 'bg-green-100 text-green-800' },
  totalmente_depreciado: { label: 'Totalmente depreciado', className: 'bg-blue-100 text-blue-800' },
  dado_de_baja: { label: 'Dado de baja', className: 'bg-gray-200 text-gray-700' },
};

const FixedAssetDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fixedAssetsAPI.getById(id);
      setAsset(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando el activo fijo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-400">Cargando...</div>
      </Layout>
    );
  }

  if (!asset) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-400">Activo fijo no encontrado</div>
      </Layout>
    );
  }

  const depreciableBase = Number(asset.acquisition_cost) - Number(asset.salvage_value || 0);
  const progressPct = depreciableBase > 0 ? Math.min(100, (Number(asset.accumulated_depreciation) / depreciableBase) * 100) : 0;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/accounting/fixed-assets')} className="text-gray-400 hover:text-gray-700">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{asset.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{FIXED_ASSET_CATEGORY_LABELS[asset.category] || asset.category}</p>
          </div>
          <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${STATUS_LABELS[asset.status]?.className || 'bg-gray-100 text-gray-700'}`}>
            {STATUS_LABELS[asset.status]?.label || asset.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Costo de compra</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(asset.acquisition_cost)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Dep. acumulada</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(asset.accumulated_depreciation)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Valor en libros</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(asset.book_value)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Vida útil</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{asset.useful_life_months} meses</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso de depreciación</span>
            <span>{progressPct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500">Fecha de compra:</span> <span className="text-gray-900">{formatDate(asset.acquisition_date)}</span></div>
          <div><span className="text-gray-500">Valor residual:</span> <span className="text-gray-900">{formatCurrency(asset.salvage_value)}</span></div>
          <div><span className="text-gray-500">Método:</span> <span className="text-gray-900">Línea recta</span></div>
          <div><span className="text-gray-500">Cuenta del activo:</span> <span className="text-gray-900">{asset.asset_account ? `${asset.asset_account.code} — ${asset.asset_account.name}` : '—'}</span></div>
          <div><span className="text-gray-500">Cuenta dep. acumulada:</span> <span className="text-gray-900">{asset.accumulated_depreciation_account ? `${asset.accumulated_depreciation_account.code} — ${asset.accumulated_depreciation_account.name}` : '—'}</span></div>
          {asset.status === 'dado_de_baja' && (
            <>
              <div><span className="text-gray-500">Fecha de baja:</span> <span className="text-gray-900">{formatDate(asset.disposal_date)}</span></div>
              {asset.disposal_reason && <div className="col-span-2 md:col-span-3"><span className="text-gray-500">Motivo:</span> <span className="text-gray-900">{asset.disposal_reason}</span></div>}
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 text-sm">Histórico de depreciación</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Período', 'Monto', 'Saldo acumulado', 'Asiento'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(asset.depreciation_entries || []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Todavía no se ha generado depreciación para este activo</td></tr>
                )}
                {(asset.depreciation_entries || []).map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{entry.period}</td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{formatCurrency(entry.amount)}</td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{formatCurrency(entry.accumulated_after)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {entry.journal_entry ? (
                        <Link to="/accounting/journal-entries" className="text-indigo-600 hover:underline">{entry.journal_entry.entry_number}</Link>
                      ) : (
                        <span className="text-amber-600 text-xs">Sin asiento — falta mapear la cuenta de gasto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FixedAssetDetailPage;
