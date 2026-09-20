import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import useProductsStore from '../../store/productsStore';
import useEquivalencesStore from '../../store/equivalencesStore';
import useCategoriesStore from '../../store/categoriesStore';
import ProductFormModal from '../../components/products/ProductFormModal';
import ProductImageViewer from '../../components/products/ProductImageViewer';
import EquivalencesSection from '../../components/products/EquivalencesSection';
import VehicleApplicationsSection from '../../components/products/VehicleApplicationsSection';
import MovementsSection from '../../components/products/MovementsSection';
import { ArrowLeft, Package, Users, Truck, Car, Activity, Edit3, ZoomIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsAPI } from '../../api/products';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const TABS = [
  { key: 'general', label: 'General', icon: Package },
  { key: 'equivalencias', label: 'Equivalencias', icon: Users },
  { key: 'vehiculos', label: 'Aplicación Vehicular', icon: Car },
  { key: 'movimientos', label: 'Movimientos', icon: Activity },
];

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedProduct: product, isLoading, fetchProductById } = useProductsStore();
  const { categories, fetchCategories } = useCategoriesStore();
  const [activeTab, setActiveTab] = useState('general');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showInProcess, setShowInProcess] = useState(false);
  const [inProcessDocs, setInProcessDocs] = useState(null);
  const [inProcessLoading, setInProcessLoading] = useState(false);

  useEffect(() => {
    if (id) fetchProductById(id);
    fetchCategories();
  }, [id, fetchProductById, fetchCategories]);

  const toggleInProcess = async () => {
    const next = !showInProcess;
    setShowInProcess(next);
    if (next && inProcessDocs === null && id) {
      setInProcessLoading(true);
      try {
        const { data } = await productsAPI.getInProcess(id);
        setInProcessDocs(data || []);
      } catch (err) {
        toast.error('No se pudo cargar el detalle de cantidad en trámite');
        setInProcessDocs([]);
      } finally {
        setInProcessLoading(false);
      }
    }
  };

  if (isLoading && !product) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Producto no encontrado</p>
          <button onClick={() => navigate('/products')} className="mt-4 text-blue-600 hover:underline">
            Volver a productos
          </button>
        </div>
      </Layout>
    );
  }

  const stockColor = !product.track_inventory
    ? 'text-gray-400'
    : product.current_stock <= 0
      ? 'text-red-600'
      : product.current_stock <= (product.min_stock || 0)
        ? 'text-orange-500'
        : 'text-green-600';

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/products')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                {product.image_url && (
                  <button
                    type="button"
                    onClick={() => setShowImageViewer(true)}
                    className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 group shrink-0"
                    title="Ver imagen completa"
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                      <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </button>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500 font-mono">{product.sku}</span>
                    {product.barcode && (
                      <span className="text-sm text-gray-400">| {product.barcode}</span>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {product.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Edit3 className="w-4 h-4" />
            Editar
          </button>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Stock</p>
            <p className={`text-2xl font-bold mt-1 ${stockColor}`}>
              {product.track_inventory ? parseFloat(product.current_stock || 0) : 'N/A'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Precio Venta</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">{COP(product.sale_price)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Costo Promedio</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">{COP(product.average_cost)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Categoría</p>
            <p className="text-lg font-semibold mt-1 text-gray-900">{product.category?.name || 'Sin categoría'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === t.key
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Información Básica</h3>
                <DetailRow label="Nombre" value={product.name} />
                <DetailRow label="SKU" value={product.sku} mono />
                <DetailRow label="Código de barras" value={product.barcode || '—'} mono />
                <DetailRow label="Descripción" value={product.description || '—'} />
                <DetailRow label="Marca" value={product.brand || '—'} />
                <DetailRow label="Categoría" value={product.category?.name || '—'} />
                <DetailRow label="Unidad" value={product.unit_of_measure || '—'} />
                <DetailRow label="Tipo" value={product.product_type} />
                {product.vehicle && (
                  <div className="pt-2">
                    <span className="text-sm text-gray-500">Vehículo vinculado</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/workshop/vehicles/${product.vehicle.id}`)}
                      className="block mt-1 text-sm font-medium text-blue-600 hover:underline text-left"
                    >
                      {product.vehicle.plate} — {product.vehicle.brand} {product.vehicle.model} {product.vehicle.year || ''}
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Inventario y Precios</h3>
                <DetailRow label="Precio base" value={COP(product.base_price)} />
                <DetailRow label="Precio venta" value={COP(product.sale_price)} />
                <DetailRow label="Costo promedio" value={COP(product.average_cost)} />
                <DetailRow label="Margen" value={`${product.profit_margin_percentage || 0}%`} />
                <DetailRow label="Stock actual" value={product.current_stock} />
                <DetailRow label="Stock reservado" value={product.reserved_stock} />
                <DetailRow
                  label="En trámite"
                  value={parseFloat(product.in_process_qty || 0)}
                  hint="Comprometido por ventas en borrador u órdenes de trabajo aprobadas que aún no se descuentan del stock"
                />
                <DetailRow
                  label="Disponible real"
                  value={product.available_real ?? (product.current_stock - (product.in_process_qty || 0))}
                  hint="Stock actual menos la cantidad en trámite"
                />
                <DetailRow label="Punto de reorden" value={product.reorder_point || '—'} />
                <DetailRow label="Stock mínimo" value={product.min_stock || '—'} />
                <DetailRow label="Stock máximo" value={product.max_stock || '—'} />
                <DetailRow label="Permitir stock negativo" value={product.allow_negative_stock ? 'Sí' : 'No'} />
              </div>
            </div>
            {product.in_process_qty > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={toggleInProcess}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Documentos en trámite ({parseFloat(product.in_process_qty)})
                  </h3>
                  <svg
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${showInProcess ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showInProcess && (
                  <div className="mt-3">
                    {inProcessLoading ? (
                      <p className="text-sm text-gray-500">Cargando...</p>
                    ) : !inProcessDocs || inProcessDocs.length === 0 ? (
                      <p className="text-sm text-gray-500">No hay documentos que comprometan este producto.</p>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="py-1 pr-4 font-medium">Documento</th>
                            <th className="py-1 pr-4 font-medium">Cliente</th>
                            <th className="py-1 pr-4 font-medium">Cantidad</th>
                            <th className="py-1 pr-4 font-medium">Estado</th>
                            <th className="py-1 pr-4 font-medium">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {inProcessDocs.map((doc, idx) => (
                            <tr key={`${doc.tipo}-${doc.id}-${idx}`}>
                              <td className="py-1.5 pr-4">
                                <button
                                  type="button"
                                  onClick={() => navigate(
                                    doc.tipo === 'venta'
                                      ? `/sales/${doc.id}`
                                      : `/workshop/work-orders/${doc.id}`
                                  )}
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  {doc.numero || doc.id}
                                </button>
                                <span className="ml-1 text-xs text-gray-400">
                                  ({doc.tipo === 'venta' ? 'Venta' : 'OT'})
                                </span>
                              </td>
                              <td className="py-1.5 pr-4 text-gray-700">{doc.cliente || '—'}</td>
                              <td className="py-1.5 pr-4 text-gray-700">{parseFloat(doc.cantidad || 0)}</td>
                              <td className="py-1.5 pr-4 text-gray-700">{doc.estado || '—'}</td>
                              <td className="py-1.5 pr-4 text-gray-700">
                                {doc.fecha ? new Date(doc.fecha).toLocaleDateString('es-CO') : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
            {(product.has_tax || product.tax_config) && (
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Impuestos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <DetailRow label="IVA" value={product.tax_config?.iva?.enabled ? `${product.tax_config.iva.rate}%` : (product.has_tax ? `${product.tax_percentage}%` : 'Exento')} />
                  <DetailRow label="INC" value={product.tax_config?.inc?.enabled ? `${product.tax_config.inc.rate}%` : 'No aplica'} />
                  <DetailRow label="ICA" value={product.tax_config?.ica?.enabled ? `${product.tax_config.ica.rate}%` : 'No aplica'} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'equivalencias' && (
          <EquivalencesSection productId={id} />
        )}

        {activeTab === 'vehiculos' && (
          <VehicleApplicationsSection productId={id} />
        )}

        {activeTab === 'movimientos' && (
          <MovementsSection productId={id} />
        )}
      </div>

      {/* Modal de edición */}
      <ProductFormModal
        isOpen={showEditModal}
        product={product}
        onClose={() => {
          setShowEditModal(false);
          fetchProductById(id);
        }}
      />

      {showImageViewer && (
        <ProductImageViewer product={product} onClose={() => setShowImageViewer(false)} />
      )}
    </Layout>
  );
}

function DetailRow({ label, value, mono = false, hint = null }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-sm text-gray-500" title={hint || undefined}>{label}</span>
      <span className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
