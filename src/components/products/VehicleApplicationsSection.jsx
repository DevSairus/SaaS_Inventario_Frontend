import { useEffect, useState } from 'react';
import useVehicleApplicationsStore from '../../store/vehicleApplicationsStore';
import { Car, Plus, Trash2, Edit3, X, Check } from 'lucide-react';

const VEHICLE_TYPES = [
  { value: 'automovil', label: 'Automóvil' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'motocicleta', label: 'Motocicleta' },
  { value: 'camion', label: 'Camión' },
  { value: 'otro', label: 'Otro' },
];

export default function VehicleApplicationsSection({ productId }) {
  const { applications, isLoading, fetchApplications, addApplication, updateApplication, removeApplication, fetchBrandsAndLines, brandsAndLines } = useVehicleApplicationsStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Form state
  const [form, setForm] = useState({
    brand: '', line: '', year_from: '', year_to: '', engine: '', vehicle_type: '', notes: ''
  });
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [lineSuggestions, setLineSuggestions] = useState([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showLineDropdown, setShowLineDropdown] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchApplications(productId);
      fetchBrandsAndLines();
    }
  }, [productId, fetchApplications, fetchBrandsAndLines]);

  // Sugerencias de marca
  useEffect(() => {
    if (form.brand.length >= 1) {
      const unique = [...new Set(brandsAndLines.map(b => b.brand))];
      const filtered = unique.filter(b => b.toLowerCase().includes(form.brand.toLowerCase()));
      setBrandSuggestions(filtered);
    } else {
      setBrandSuggestions([]);
    }
  }, [form.brand, brandsAndLines]);

  // Sugerencias de línea (depende de la marca seleccionada)
  useEffect(() => {
    if (form.line.length >= 1 && form.brand) {
      const brandData = brandsAndLines.find(b => b.brand.toLowerCase() === form.brand.toLowerCase());
      const lines = brandData ? brandData.lines : [];
      const allLines = [...new Set([...lines, ...brandsAndLines.flatMap(b => b.lines)])];
      const filtered = allLines.filter(l => l.toLowerCase().includes(form.line.toLowerCase()));
      setLineSuggestions(filtered);
    } else {
      setLineSuggestions([]);
    }
  }, [form.line, form.brand, brandsAndLines]);

  const resetForm = () => {
    setForm({ brand: '', line: '', year_from: '', year_to: '', engine: '', vehicle_type: '', notes: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.brand.trim() || !form.line.trim()) return;

    const data = {
      brand: form.brand.trim(),
      line: form.line.trim(),
      year_from: form.year_from ? parseInt(form.year_from) : null,
      year_to: form.year_to ? parseInt(form.year_to) : null,
      engine: form.engine.trim() || null,
      vehicle_type: form.vehicle_type || null,
      notes: form.notes.trim() || null
    };

    let success;
    if (editingId) {
      success = await updateApplication(productId, editingId, data);
    } else {
      success = await addApplication(productId, data);
    }

    if (success) resetForm();
  };

  const handleEdit = (app) => {
    setForm({
      brand: app.brand,
      line: app.line,
      year_from: app.year_from || '',
      year_to: app.year_to || '',
      engine: app.engine || '',
      vehicle_type: app.vehicle_type || '',
      notes: app.notes || ''
    });
    setEditingId(app.id);
    setShowForm(true);
  };

  const handleDelete = async (appId) => {
    const success = await removeApplication(productId, appId);
    if (success) setConfirmDelete(null);
  };

  if (isLoading && applications.length === 0) {
    return (
      <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Aplicaciones Vehiculares</h3>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
            {applications.length === 0
              ? 'Este producto no tiene aplicaciones vehiculares registradas'
              : `${applications.length} aplicación(es) vehicular(es)`}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Agregar Aplicación
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-graphite rounded-xl border border-blue-200 dark:border-blue-800/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {editingId ? 'Editar Aplicación' : 'Nueva Aplicación'}
            </h4>
            <button onClick={resetForm} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Marca */}
            <div className="relative">
              <label className="text-xs text-gray-500 dark:text-gray-500 mb-0.5 block">Marca *</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => {
                  setForm(p => ({ ...p, brand: e.target.value }));
                  setShowBrandDropdown(true);
                }}
                onFocus={() => setShowBrandDropdown(true)}
                onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
                placeholder="Chevrolet"
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showBrandDropdown && brandSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                  {brandSuggestions.map(b => (
                    <button
                      key={b}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setForm(p => ({ ...p, brand: b }));
                        setShowBrandDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-white/10"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Línea */}
            <div className="relative">
              <label className="text-xs text-gray-500 dark:text-gray-500 mb-0.5 block">Línea *</label>
              <input
                type="text"
                value={form.line}
                onChange={(e) => {
                  setForm(p => ({ ...p, line: e.target.value }));
                  setShowLineDropdown(true);
                }}
                onFocus={() => setShowLineDropdown(true)}
                onBlur={() => setTimeout(() => setShowLineDropdown(false), 200)}
                placeholder="Aveo"
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showLineDropdown && lineSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                  {lineSuggestions.map(l => (
                    <button
                      key={l}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setForm(p => ({ ...p, line: l }));
                        setShowLineDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-white/10"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tipo */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-500 mb-0.5 block">Tipo de vehículo</label>
              <select
                value={form.vehicle_type}
                onChange={(e) => setForm(p => ({ ...p, vehicle_type: e.target.value }))}
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {VEHICLE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Motor */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-500 mb-0.5 block">Motor</label>
              <input
                type="text"
                value={form.engine}
                onChange={(e) => setForm(p => ({ ...p, engine: e.target.value }))}
                placeholder="1.6, 1.4 Turbo"
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Año desde */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-500 mb-0.5 block">Año desde</label>
              <input
                type="number"
                value={form.year_from}
                onChange={(e) => setForm(p => ({ ...p, year_from: e.target.value }))}
                placeholder="2008"
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Año hasta */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-500 mb-0.5 block">Año hasta</label>
              <input
                type="number"
                value={form.year_to}
                onChange={(e) => setForm(p => ({ ...p, year_to: e.target.value }))}
                placeholder="2015 (vacío = vigente)"
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notas */}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 dark:text-gray-500 mb-0.5 block">Notas</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Observaciones..."
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!form.brand.trim() || !form.line.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {editingId ? 'Guardar Cambios' : 'Agregar'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {applications.length === 0 && !showForm && (
        <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 p-8">
          <div className="text-center">
            <Car className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-500 font-medium">Sin aplicaciones vehiculares</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">
              Define a qué vehículos le sirve este repuesto
            </p>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              <Plus className="w-4 h-4" />
              Agregar primera aplicación
            </button>
          </div>
        </div>
      )}

      {/* Applications list */}
      {applications.length > 0 && (
        <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-graphite-2">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase">Marca</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase">Línea</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase">Años</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase">Motor</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {applications.map((app) => {
                const typeLabel = VEHICLE_TYPES.find(t => t.value === app.vehicle_type)?.label || '—';
                const yearRange = app.year_from
                  ? `${app.year_from} — ${app.year_to || 'Vigente'}`
                  : 'Todos';

                return (
                  <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100">{app.brand}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{app.line}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-500">{typeLabel}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-500">{yearRange}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-500">{app.engine || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(app)}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {confirmDelete === app.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(app.id)}
                              className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Confirmar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(app.id)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
