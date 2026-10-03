// frontend/src/pages/accounting/TaxClassificationPage.jsx
//
// Clasificación tributaria de compras — pantalla del CONTADOR.
// El dueño del negocio no decide nada de esto: sin asignar nada, el sistema
// clasifica solo (servicio → "Servicios generales", lo demás → "Compras
// generales"). Aquí el contador:
//  1. revisa las compras del año por concepto (lo que irá a la Exógena 1001),
//  2. asigna conceptos por CATEGORÍA (pocas; las heredan sus productos),
//  3. marca EXCEPCIONES por producto, en bloque.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../../components/layout/Layout';
import { taxClassificationAPI } from '../../api/accounting';
import { invalidateRetentionCatalog } from '../../hooks/useRetentionCatalog';

const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
const card = 'bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10';

export default function TaxClassificationPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catEdits, setCatEdits] = useState({});
  const [savingCats, setSavingCats] = useState(false);
  const [detail, setDetail] = useState(null); // { concept, lines }

  // Excepciones por producto
  const [filters, setFilters] = useState({ search: '', category_id: '', type: '', only_overrides: false });
  const [products, setProducts] = useState({ rows: [], total: 0, page: 1, pages: 1 });
  const [selected, setSelected] = useState(new Set());
  const [bulkConcept, setBulkConcept] = useState('');
  const [savingProducts, setSavingProducts] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taxClassificationAPI.overview(year);
      setData(res.data);
      setCatEdits({});
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error cargando la clasificación');
    } finally {
      setLoading(false);
    }
  }, [year]);

  const loadProducts = useCallback(async (page = 1) => {
    try {
      const res = await taxClassificationAPI.products({ ...filters, only_overrides: filters.only_overrides ? 'true' : undefined, page });
      setProducts({ rows: res.data, total: res.pagination.total, page: res.pagination.page, pages: res.pagination.pages });
      setSelected(new Set());
    } catch (e) {
      toast.error('Error cargando productos');
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadProducts(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filters.category_id, filters.type, filters.only_overrides]);

  const concepts = data?.concepts || [];
  const conceptName = useMemo(() => {
    const m = new Map(concepts.map((c) => [c.id, c.name]));
    return (id) => m.get(id) || id;
  }, [concepts]);

  const totalBase = (data?.summary || []).reduce((s, c) => s + c.base, 0);
  const pendingCats = Object.keys(catEdits).length;

  const saveCategories = async () => {
    setSavingCats(true);
    try {
      await taxClassificationAPI.saveCategories(Object.entries(catEdits).map(([category_id, concept_id]) => ({ category_id, concept_id: concept_id || null })));
      toast.success('Clasificación de categorías guardada');
      invalidateRetentionCatalog();
      await load();
      loadProducts(products.page);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error guardando');
    } finally {
      setSavingCats(false);
    }
  };

  const saveProducts = async (conceptId) => {
    if (selected.size === 0) return;
    setSavingProducts(true);
    try {
      await taxClassificationAPI.saveProducts([...selected], conceptId || null);
      toast.success(conceptId ? `${selected.size} producto(s) clasificados` : `Excepción quitada a ${selected.size} producto(s)`);
      setBulkConcept('');
      await Promise.all([loadProducts(products.page), load()]);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error guardando');
    } finally {
      setSavingProducts(false);
    }
  };

  const openDetail = async (c) => {
    try {
      const res = await taxClassificationAPI.lines(year, c.concept_id);
      setDetail({ concept: c, lines: res.data });
    } catch {
      toast.error('Error cargando el detalle');
    }
  };

  const allSelected = products.rows.length > 0 && products.rows.every((p) => selected.has(p.id));
  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Clasificación tributaria de compras</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-3xl">
              Para el contador. Define el concepto de retención (compras, servicios, honorarios…) de lo que compra la empresa:
              con eso se calculan la ReteFuente y los renglones de la Exógena 1001. Sin asignar nada, los servicios cuentan como
              "Servicios generales" y lo demás como "Compras generales".
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Año</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-2 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2">
              {[0, 1, 2].map((d) => new Date().getFullYear() - d).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* 1. Resumen por concepto */}
        <div className={card}>
          <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">1. Compras del año por concepto</h2>
            <button onClick={() => navigate('/accounting/exogena')} className="text-xs text-blue-600 hover:underline">Ir a Exógena DIAN →</button>
          </div>
          {loading ? <div className="p-6 text-sm text-gray-400">Cargando...</div> : (data?.summary || []).length === 0 ? (
            <div className="p-6 text-sm text-gray-400">No hay compras confirmadas en {year}.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead><tr className="text-xs text-gray-500 uppercase">
                <th className="px-4 py-2 text-left">Concepto</th>
                <th className="px-4 py-2 text-right">Base comprada</th>
                <th className="px-4 py-2 text-right">% del total</th>
                <th className="px-4 py-2 text-right">ReteFuente</th>
                <th className="px-4 py-2 text-right">Proveedores</th>
                <th></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {data.summary.map((c) => (
                  <tr key={c.concept_id}>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{c.name}</td>
                    <td className="px-4 py-2 text-right">{money(c.base)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{totalBase > 0 ? `${Math.round((c.base / totalBase) * 100)}%` : '—'}</td>
                    <td className="px-4 py-2 text-right">{money(c.retefuente)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{c.suppliers}</td>
                    <td className="px-4 py-2 text-right"><button onClick={() => openDetail(c)} className="text-xs text-blue-600 hover:underline">Ver detalle</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 2. Categorías */}
        <div className={card}>
          <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">2. Concepto por categoría</h2>
              <p className="text-xs text-gray-500">Lo heredan todos los productos de la categoría (salvo excepciones).</p>
            </div>
            {pendingCats > 0 && (
              <button onClick={saveCategories} disabled={savingCats} className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {savingCats ? 'Guardando...' : `Guardar ${pendingCats} cambio(s)`}
              </button>
            )}
          </div>
          {loading ? <div className="p-6 text-sm text-gray-400">Cargando...</div> : (data?.categories || []).length === 0 ? (
            <div className="p-6 text-sm text-gray-400">
              No hay categorías creadas. Los productos usan la clasificación automática; puedes marcar excepciones abajo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="text-xs text-gray-500 uppercase">
                  <th className="px-4 py-2 text-left">Categoría</th>
                  <th className="px-4 py-2 text-right">Productos</th>
                  <th className="px-4 py-2 text-right">Compras {year}</th>
                  <th className="px-4 py-2 text-left">Concepto</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {data.categories.map((c) => {
                    const value = catEdits[c.id] !== undefined ? catEdits[c.id] : (c.retention_concept || '');
                    const auto = c.services > 0 && c.services === c.products ? 'Servicios generales' : (c.services > 0 ? 'Automático por tipo' : 'Compras generales');
                    return (
                      <tr key={c.id} className={catEdits[c.id] !== undefined ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}>
                        <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{c.name}</td>
                        <td className="px-4 py-2 text-right text-gray-500">
                          {c.products}{c.overrides > 0 && <span className="block text-[10px] text-blue-600">{c.overrides} excepción(es)</span>}
                        </td>
                        <td className="px-4 py-2 text-right">{money(c.purchased)}</td>
                        <td className="px-4 py-2">
                          <select value={value} onChange={(e) => setCatEdits((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            className="px-2 py-1 border border-gray-300 dark:border-white/10 rounded text-sm dark:bg-graphite-2 min-w-[220px]">
                            <option value="">Automático ({auto})</option>
                            {concepts.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3. Excepciones por producto */}
        <div className={card}>
          <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">3. Excepciones por producto</h2>
            <p className="text-xs text-gray-500">Solo para productos que no encajan en su categoría. Filtra, selecciona varios y asigna de una vez.</p>
          </div>
          <div className="p-3 flex flex-wrap items-end gap-2 border-b border-gray-100 dark:border-white/5">
            <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') loadProducts(1); }}
              placeholder="Buscar por nombre o código (Enter)" className="flex-1 min-w-[220px] px-3 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2" />
            <select value={filters.category_id} onChange={(e) => setFilters((f) => ({ ...f, category_id: e.target.value }))} className="px-2 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2">
              <option value="">Todas las categorías</option>
              <option value="none">Sin categoría</option>
              {(data?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} className="px-2 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2">
              <option value="">Bienes y servicios</option>
              <option value="goods">Solo bienes</option>
              <option value="service">Solo servicios</option>
            </select>
            <label className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={filters.only_overrides} onChange={(e) => setFilters((f) => ({ ...f, only_overrides: e.target.checked }))} className="rounded border-gray-300" />
              Solo con excepción
            </label>
            <button onClick={() => loadProducts(1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">Buscar</button>
          </div>

          {selected.size > 0 && (
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-blue-900 dark:text-blue-200">{selected.size} seleccionado(s)</span>
              <select value={bulkConcept} onChange={(e) => setBulkConcept(e.target.value)} className="px-2 py-1 border border-blue-200 rounded text-sm bg-white">
                <option value="">Elegir concepto…</option>
                {concepts.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
              <button disabled={!bulkConcept || savingProducts} onClick={() => saveProducts(bulkConcept)} className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50">Asignar</button>
              <button disabled={savingProducts} onClick={() => saveProducts(null)} className="px-3 py-1 rounded border border-blue-300 text-blue-700 bg-white disabled:opacity-50">Quitar excepción</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="text-xs text-gray-500 uppercase">
                <th className="px-3 py-2 w-8"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(products.rows.map((p) => p.id)))} className="rounded border-gray-300" /></th>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                <th className="px-3 py-2 text-left">Concepto aplicado</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {products.rows.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Sin productos con este filtro.</td></tr>}
                {products.rows.map((p) => (
                  <tr key={p.id} className={selected.has(p.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}>
                    <td className="px-3 py-2"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="rounded border-gray-300" /></td>
                    <td className="px-3 py-2">
                      <div className="text-gray-900 dark:text-gray-100">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.sku} · {p.product_type === 'service' ? 'Servicio' : 'Bien'}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{p.category_name || '—'}</td>
                    <td className="px-3 py-2">
                      {p.retention_concept ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">{conceptName(p.retention_concept)} · excepción</span>
                      ) : (
                        <span className="text-gray-700 dark:text-gray-300">{conceptName(p.inherited_concept)} <span className="text-xs text-gray-400">({p.inherited_from})</span></span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {products.pages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-white/10 text-sm">
              <span className="text-gray-500">{products.total} producto(s)</span>
              <div className="flex gap-2">
                <button disabled={products.page <= 1} onClick={() => loadProducts(products.page - 1)} className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40">Anterior</button>
                <span className="px-2 py-1 text-gray-500">{products.page} / {products.pages}</span>
                <button disabled={products.page >= products.pages} onClick={() => loadProducts(products.page + 1)} className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detalle de un concepto */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-graphite rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-graphite px-5 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{detail.concept.name} — {year}</h3>
                <p className="text-xs text-gray-500">{detail.lines.length} línea(s) · {money(detail.concept.base)}. Para reclasificar, cambia la categoría o marca la excepción del producto.</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <table className="min-w-full text-sm">
              <thead><tr className="text-xs text-gray-500 uppercase">
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Compra</th>
                <th className="px-4 py-2 text-left">Proveedor</th>
                <th className="px-4 py-2 text-left">Producto</th>
                <th className="px-4 py-2 text-left">Origen</th>
                <th className="px-4 py-2 text-right">Base</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {detail.lines.map((l) => (
                  <tr key={l.item_id}>
                    <td className="px-4 py-1.5 text-gray-500">{String(l.purchase_date).slice(0, 10)}</td>
                    <td className="px-4 py-1.5"><button onClick={() => navigate(`/purchases/${l.purchase_id}`)} className="text-blue-600 hover:underline">{l.purchase_number}</button></td>
                    <td className="px-4 py-1.5">{l.supplier_name}</td>
                    <td className="px-4 py-1.5">{l.product_name}<div className="text-xs text-gray-400">{l.category_name || 'Sin categoría'}</div></td>
                    <td className="px-4 py-1.5 text-xs text-gray-500">{l.source}</td>
                    <td className="px-4 py-1.5 text-right">{money(l.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
