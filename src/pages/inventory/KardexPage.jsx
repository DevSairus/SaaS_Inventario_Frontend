// pages/inventory/KardexPage.jsx
//
// Inventario → Kardex: elige un producto y ve su kardex valorizado.
// Acepta ?product=<id> para llegar directo desde otra pantalla.
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import ProductSearchInput from '../../components/common/ProductSearchInput';
import KardexView from '../../components/inventory/KardexView';
import { productsAPI } from '../../api/products';

export default function KardexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productId = searchParams.get('product') || '';
  const [search, setSearch] = useState('');

  // Al llegar con ?product= se muestra el nombre en el buscador.
  useEffect(() => {
    if (!productId || search) return;
    productsAPI.getById(productId)
      .then((r) => {
        const p = r?.data || r;
        if (p?.name) setSearch(`${p.sku ? `${p.sku} - ` : ''}${p.name}`);
      })
      .catch(() => {});
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kardex</h1>
            <p className="text-sm text-gray-500">Entradas, salidas y saldo valorizado (costo promedio ponderado) por producto.</p>
          </div>
          {productId && (
            <Link to={`/products/${productId}`} className="text-sm text-blue-600 hover:underline">Ver ficha del producto</Link>
          )}
        </div>

        <div className="max-w-xl">
          <ProductSearchInput
            value={search}
            onChange={setSearch}
            onSelect={(p) => { setSearch(`${p.sku ? `${p.sku} - ` : ''}${p.name}`); setSearchParams({ product: p.id }); }}
            onClear={() => { setSearch(''); setSearchParams({}); }}
            hasSelection={!!productId}
            show={{ stock: true, cost: true }}
            autoFocus={!productId}
          />
        </div>

        {productId ? (
          <KardexView key={productId} productId={productId} />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Busca un producto por SKU, código o nombre para ver su kardex.
          </div>
        )}
      </div>
    </Layout>
  );
}
