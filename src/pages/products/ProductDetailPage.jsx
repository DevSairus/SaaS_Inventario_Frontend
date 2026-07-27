import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import useProductsStore from '../../store/productsStore';
import useEquivalencesStore from '../../store/equivalencesStore';
import useCategoriesStore from '../../store/categoriesStore';
import ProductFormModal from '../../components/products/ProductFormModal';
import EquivalencesSection from '../../components/products/EquivalencesSection';
import VehicleApplicationsSection from '../../components/products/VehicleApplicationsSection';
import { ArrowLeft, Package, Users, Truck, Car, Activity, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    if (id) fetchProductById(id);
    fetchCategories();
  }, [id, fetchProductById, fetchCategories]);

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
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                  />
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
                <DetailRow label="Categoría" value={product.category?.name || '—'} />
                <DetailRow label="Unidad" value={product.unit_of_measure || '—'} />
                <DetailRow label="Tipo" value={product.product_type} />
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Inventario y Precios</h3>
                <DetailRow label="Precio base" value={COP(product.base_price)} />
                <DetailRow label="Precio venta" value={COP(product.sale_price)} />
                <DetailRow label="Costo promedio" value={COP(product.average_cost)} />
                <DetailRow label="Margen" value={`${product.profit_margin_percentage || 0}%`} />
                <DetailRow label="Stock actual" value={product.current_stock} />
                <DetailRow label="Stock reservado" value={product.reserved_stock} />
                <DetailRow label="Stock disponible" value={product.available_stock} />
                <DetailRow label="Punto de reorden" value={product.reorder_point || '—'} />
                <DetailRow label="Stock mínimo" value={product.min_stock || '—'} />
                <DetailRow label="Stock máximo" value={product.max_stock || '—'} />
                <DetailRow label="Permitir stock negativo" value={product.allow_negative_stock ? 'Sí' : 'No'} />
              </div>
            </div>
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Movimientos de Stock</p>
              <p className="text-sm text-gray-400 mt-1">Historial de entradas, salidas y ajustes</p>
            </div>
          </div>
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
    </Layout>
  );
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
