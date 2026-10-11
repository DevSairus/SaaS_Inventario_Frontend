// frontend/src/utils/saleAmounts.js
// Espejo de backend/src/utils/saleAmounts.js: el saldo de una venta descuenta
// lo cancelado por devoluciones aprobadas (returned_amount).
export const saleBalance = (sale) =>
  Math.max(
    0,
    Number(sale?.total_amount || 0) - Number(sale?.paid_amount || 0) - Number(sale?.returned_amount || 0)
  );
