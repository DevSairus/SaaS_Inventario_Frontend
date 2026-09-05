import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@api/axios';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import DivipolaCitySelect from '@components/common/DivipolaCitySelect';

// El selector por defecto pide el catálogo por /api/dian/divipola, que
// requiere tenantMiddleware -- el panel superadmin no está atado a ningún
// tenant, así que usa /api/superadmin/divipola (mismo catálogo, otra ruta).
const getDivipolaSuperadmin = () => api.get('/superadmin/divipola');

/**
 * Edita ciudad (DIVIPOLA) y régimen fiscal de un tenant, usados al armar su
 * prefactura hacia el Núcleo (ver ncfSyncService.construirPrefactura). Antes
 * no existía ningún formulario para esto -- ncf_ciudad siempre quedaba vacío.
 */
export default function TenantNcfCiudadModal({ tenant, onClose, onSaved }) {
  const [departmentCode, setDepartmentCode] = useState(tenant.ncf_city_code?.substring(0, 2) || '');
  const [cityCode, setCityCode] = useState(tenant.ncf_city_code || '');
  const [regimenCode, setRegimenCode] = useState(tenant.ncf_regimen_code || 'O-47');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!cityCode) {
      toast.error('Selecciona una ciudad');
      return;
    }
    try {
      setSaving(true);
      await api.patch(`/superadmin/ncf-config/tenants/${tenant.id}`, {
        ncf_city_code: cityCode,
        ncf_regimen_code: regimenCode,
      });
      toast.success('Ciudad NCF actualizada');
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen title={`Ciudad NCF — ${tenant.business_name || tenant.company_name}`} onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Ciudad y régimen fiscal usados al facturarle a este tenant su suscripción a través del Núcleo.
        </p>

        <DivipolaCitySelect
          departmentCode={departmentCode}
          cityCode={cityCode}
          onChange={({ departmentCode: dc, cityCode: cc }) => {
            setDepartmentCode(dc);
            setCityCode(cc);
          }}
          fetchCatalog={getDivipolaSuperadmin}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            Código de responsabilidad fiscal (DIAN)
          </label>
          <input
            type="text"
            value={regimenCode}
            onChange={(e) => setRegimenCode(e.target.value)}
            placeholder="O-47"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
