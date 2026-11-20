// Kardex del producto en su ficha (versión compacta de Inventario → Kardex).
import KardexView from '../inventory/KardexView';

export default function MovementsSection({ productId }) {
  return <KardexView productId={productId} compact />;
}
