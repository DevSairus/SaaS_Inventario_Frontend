// frontend/src/components/settings/TaxConfigSection.jsx
import { useState } from 'react';

const TAX_TYPES = [
  { code: '01', name: 'IVA', description: 'Impuesto sobre las Ventas', unit: '%', defaultRate: 19 },
  { code: '04', name: 'INC', description: 'Impoconsumo (licores, bebidas, etc.)', unit: '%', defaultRate: 8 },
  { code: '03', name: 'ICA', description: 'Impuesto de Industria y Comercio', unit: '‰', defaultRate: 4.14 },
];

const RETENTION_TYPES = [
  { code: '05', name: 'ReteIVA', description: 'Retención de IVA', unit: '%', defaultRate: 15, base: 'IVA facturado' },
  { code: '06', name: 'ReteICA', description: 'Retención de ICA', unit: '‰', defaultRate: 40, base: 'Base gravable' },
  { code: '07', name: 'ReteFuente', description: 'Retención en la Fuente', unit: '%', defaultRate: 2.5, base: 'Base gravable' },
];

export default function TaxConfigSection({ taxConfig, onChange }) {
  const config = taxConfig || {};
  const taxes = config.taxes || TAX_TYPES.map(t => ({ ...t, rate: t.defaultRate, enabled: false }));
  const retentions = config.retentions || RETENTION_TYPES.map(r => ({ ...r, rate: r.defaultRate, enabled: false }));
  const isAutoretenedor = config.is_autoretenedor || false;

  const updateTax = (code, field, value) => {
    const updated = taxes.map(t => t.code === code ? { ...t, [field]: value } : t);
    onChange({ ...config, taxes: updated });
  };

  const updateRetention = (code, field, value) => {
    const updated = retentions.map(r => r.code === code ? { ...r, [field]: value } : r);
    onChange({ ...config, retentions: updated });
  };

  return (
    <div className="space-y-6">
      {/* Impuestos que cobra el tenant */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Impuestos que cobra tu empresa</h3>
        <p className="text-xs text-gray-500 mb-4">
          Estos impuestos se suman al precio de venta. Se aplican por producto según su configuración.
        </p>
        <div className="space-y-3">
          {TAX_TYPES.map(taxType => {
            const tax = taxes.find(t => t.code === taxType.code) || { enabled: false, rate: taxType.defaultRate };
            return (
              <div key={taxType.code} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{taxType.code}</span>
                    <span className="text-sm font-medium text-gray-900">{taxType.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{taxType.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tax.rate || 0}
                    onChange={(e) => updateTax(taxType.code, 'rate', parseFloat(e.target.value) || 0)}
                    disabled={!tax.enabled}
                    min="0"
                    step="0.01"
                    className="w-20 px-2 py-1.5 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <span className="text-xs text-gray-500 w-4">{taxType.unit}</span>
                  <button
                    type="button"
                    onClick={() => updateTax(taxType.code, 'enabled', !tax.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      tax.enabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      tax.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Retenciones */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Retenciones</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Se restan del total a cobrar. Se aplican automáticamente según el cliente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Autoretenedor</span>
            <button
              type="button"
              onClick={() => onChange({ ...config, is_autoretenedor: !isAutoretenedor })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                isAutoretenedor ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isAutoretenedor ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {isAutoretenedor && (
          <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-800">
              Como <strong>autoretenedor</strong>, no se aplicarán retenciones automáticas a tus clientes.
              Las tasas configuradas abajo serán los valores por defecto para nuevos clientes.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {RETENTION_TYPES.map(retType => {
            const ret = retentions.find(r => r.code === retType.code) || { enabled: false, rate: retType.defaultRate };
            return (
              <div key={retType.code} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{retType.code}</span>
                    <span className="text-sm font-medium text-gray-900">{retType.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{retType.description} — Base: {retType.base}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={ret.rate || 0}
                    onChange={(e) => updateRetention(retType.code, 'rate', parseFloat(e.target.value) || 0)}
                    disabled={!ret.enabled}
                    min="0"
                    step="0.01"
                    className="w-20 px-2 py-1.5 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <span className="text-xs text-gray-500 w-4">{retType.unit}</span>
                  <button
                    type="button"
                    onClick={() => updateRetention(retType.code, 'enabled', !ret.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      ret.enabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      ret.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
