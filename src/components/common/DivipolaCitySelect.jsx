// frontend/src/components/common/DivipolaCitySelect.jsx
import { useState, useEffect, useMemo } from 'react';
import { getDivipola } from '../../api/dian';
import Combobox from './Combobox';

/**
 * Selector Departamento → Ciudad con autocomplete, respaldado por el
 * catálogo DIVIPOLA (códigos DANE) servido por GET /api/dian/divipola.
 *
 * Reemplaza los inputs de texto libre de ciudad/código DIVIPOLA/departamento
 * por un par de comboboxes encadenados: al elegir departamento se filtra la
 * lista de ciudades, y ambos son autocomplete (no un <select> con 1123
 * opciones). Solo permite valores que existan en la tabla DIVIPOLA.
 *
 * Props:
 *  departmentCode — código DANE (2 dígitos) del departamento seleccionado
 *  cityCode       — código DANE (5 dígitos) de la ciudad seleccionada
 *  onChange({ departmentCode, departmentName, cityCode, cityName }) — al
 *                   cambiar cualquiera de los dos selectores
 *  disabled
 *  required
 *  fetchCatalog   — opcional, por si el catálogo no se puede pedir por la
 *                   ruta tenant-scoped por defecto (GET /api/dian/divipola,
 *                   requiere tenantMiddleware). Ej: el panel superadmin no
 *                   está atado a ningún tenant, usa GET /api/superadmin/divipola.
 *                   Debe devolver la misma forma que getDivipola().
 */
export default function DivipolaCitySelect({
  departmentCode,
  cityCode,
  onChange,
  disabled = false,
  required = false,
  fetchCatalog,
}) {
  const [catalog, setCatalog] = useState({ departments: [], cities: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (fetchCatalog || getDivipola)()
      .then(res => {
        if (!mounted) return;
        const data = res.data?.data || { departments: [], cities: [] };
        setCatalog(data);
      })
      .catch(() => { if (mounted) setError('No se pudo cargar el catálogo DIVIPOLA'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Combobox espera `id` como key — mapeamos code → id sin duplicar datos
  const departmentItems = useMemo(
    () => catalog.departments.map(d => ({ id: d.code, code: d.code, name: d.name })),
    [catalog.departments]
  );
  const cityItems = useMemo(() => {
    const cities = departmentCode
      ? catalog.cities.filter(c => c.department_code === departmentCode)
      : catalog.cities;
    return cities.map(c => ({ id: c.code, code: c.code, name: c.name, department_code: c.department_code }));
  }, [catalog.cities, departmentCode]);

  const selectedDept = departmentItems.find(d => d.code === departmentCode) || null;
  const selectedCity = cityItems.find(c => c.code === cityCode) || null;

  const handleSelectDept = (dept) => {
    // Cambiar de departamento invalida la ciudad si no pertenece al nuevo depto
    const cityStillValid = selectedCity?.department_code === dept.code;
    onChange({
      departmentCode: dept.code,
      departmentName: dept.name,
      cityCode: cityStillValid ? cityCode : '',
      cityName: cityStillValid ? selectedCity.name : '',
    });
  };

  const handleClearDept = () => {
    onChange({ departmentCode: '', departmentName: '', cityCode: '', cityName: '' });
  };

  const handleSelectCity = (city) => {
    const dept = catalog.departments.find(d => d.code === city.department_code);
    onChange({
      departmentCode: city.department_code,
      departmentName: dept?.name || '',
      cityCode: city.code,
      cityName: city.name,
    });
  };

  const handleClearCity = () => {
    onChange({ departmentCode, departmentName: selectedDept?.name || '', cityCode: '', cityName: '' });
  };

  const filterByName = (item, query) =>
    item.name.toLowerCase().includes(query.toLowerCase()) || item.code.includes(query);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Departamento{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <Combobox
          placeholder={loading ? 'Cargando...' : 'Buscar departamento...'}
          items={departmentItems}
          value={selectedDept?.id ?? null}
          displayValue={selectedDept?.name}
          onSelect={handleSelectDept}
          onClear={handleClearDept}
          filterFn={filterByName}
          disabled={disabled || loading}
          renderItem={item => <span>{item.name}</span>}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ciudad / Municipio{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <Combobox
          placeholder={
            loading ? 'Cargando...' : departmentCode ? 'Buscar ciudad...' : 'Buscar ciudad (todo el país)...'
          }
          items={cityItems}
          value={selectedCity?.id ?? null}
          displayValue={selectedCity?.name}
          onSelect={handleSelectCity}
          onClear={handleClearCity}
          filterFn={filterByName}
          disabled={disabled || loading}
          renderItem={item => (
            <span>
              {item.name}
              <span className="text-gray-400 ml-1.5 text-xs">({item.code})</span>
            </span>
          )}
        />
      </div>
      {error && <p className="text-xs text-red-500 sm:col-span-2">{error}</p>}
      {!loading && !error && selectedCity && (
        <p className="text-xs text-gray-400 sm:col-span-2">
          Código DIVIPOLA: {selectedCity.code} · Departamento: {selectedCity.department_code}
        </p>
      )}
    </div>
  );
}
