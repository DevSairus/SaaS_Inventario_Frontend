/**
 * Exportar e Importar datos en formato Excel (.xlsx)
 * Versión mejorada con formatos profesionales
 */

import * as XLSX from 'xlsx';

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

/**
 * Aplicar formato de moneda a una celda
 */
const applyCurrencyFormat = (value) => {
  return {
    v: value,
    t: 'n',
    z: '"$"#,##0'
  };
};

/**
 * Aplicar formato de número con separadores de miles
 */
const applyNumberFormat = (value) => {
  return {
    v: value,
    t: 'n',
    z: '#,##0'
  };
};

// ============================================================================
// FUNCIONES DE EXPORTACIÓN MEJORADAS
// ============================================================================

/**
 * EXPORTAR CARTERA (CUENTAS POR COBRAR) - FORMATO PROFESIONAL
 */
export const exportReceivablesToExcel = (data, filename = 'cartera') => {
  const wb = XLSX.utils.book_new();
  
  // ────────────────────────────────────────────────────────────────────────
  // HOJA 1: RESUMEN POR CLIENTE
  // ────────────────────────────────────────────────────────────────────────
  if (data.by_customer && data.by_customer.length > 0) {
    const customerData = data.by_customer.map(item => ({
      'Cliente': item.customer_name || 'N/A',
      'NIT/CC': item.customer_tax_id || '',
      'Total Por Cobrar': parseFloat(item.total_pending) || 0,
      'Facturas Pendientes': parseInt(item.pending_invoices) || 0,
      'Días Promedio': Math.round(parseFloat(item.avg_days_pending) || 0),
      'Vencido': parseFloat(item.overdue_amount) || 0
    }));

    const ws1 = XLSX.utils.json_to_sheet(customerData);
    
    // Aplicar formato de moneda a las columnas de dinero
    const range = XLSX.utils.decode_range(ws1['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const totalCell = XLSX.utils.encode_cell({ r: R, c: 2 }); // Total Por Cobrar
      const overdueCell = XLSX.utils.encode_cell({ r: R, c: 5 }); // Vencido
      
      if (ws1[totalCell]) {
        ws1[totalCell] = applyCurrencyFormat(ws1[totalCell].v);
      }
      if (ws1[overdueCell]) {
        ws1[overdueCell] = applyCurrencyFormat(ws1[overdueCell].v);
      }
    }
    
    // Totales
    const totalPendiente = customerData.reduce((sum, r) => sum + (r['Total Por Cobrar'] || 0), 0);
    const totalVencido = customerData.reduce((sum, r) => sum + (r['Vencido'] || 0), 0);
    const totalFacturas = customerData.reduce((sum, r) => sum + (r['Facturas Pendientes'] || 0), 0);
    
    const totalRow = customerData.length + 2;
    ws1[`A${totalRow}`] = { v: 'TOTALES', t: 's' };
    ws1[`C${totalRow}`] = applyCurrencyFormat(totalPendiente);
    ws1[`D${totalRow}`] = { v: totalFacturas, t: 'n' };
    ws1[`F${totalRow}`] = applyCurrencyFormat(totalVencido);
    
    // Anchos de columna
    ws1['!cols'] = [
      { wch: 30 },  // Cliente
      { wch: 15 },  // NIT/CC
      { wch: 18 },  // Total Por Cobrar
      { wch: 18 },  // Facturas Pendientes
      { wch: 15 },  // Días Promedio
      { wch: 18 }   // Vencido
    ];
    
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen por Cliente');
  }
  
  // ────────────────────────────────────────────────────────────────────────
  // HOJA 2: DETALLE DE FACTURAS
  // ────────────────────────────────────────────────────────────────────────
  if (data.all_invoices && data.all_invoices.length > 0) {
    const invoiceData = data.all_invoices.map(item => ({
      'Número Factura': item.sale_number || '',
      'Fecha': item.sale_date || '',
      'Cliente': item.customer_name || '',
      'Total Factura': parseFloat(item.total_amount) || 0,
      'Pagado': parseFloat(item.paid_amount) || 0,
      'Saldo Pendiente': parseFloat(item.balance) || 0,
      'Días Vencimiento': parseInt(item.days_overdue) || 0,
      'Estado': item.status || '',
      'Vencimiento': item.due_date || ''
    }));

    const ws2 = XLSX.utils.json_to_sheet(invoiceData);
    
    // Aplicar formatos
    const range = XLSX.utils.decode_range(ws2['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      // Formatos de moneda
      ['D', 'E', 'F'].forEach(col => {
        const cell = `${col}${R + 1}`;
        if (ws2[cell]) {
          ws2[cell] = applyCurrencyFormat(ws2[cell].v);
        }
      });
    }
    
    // Totales
    const totalFactura = invoiceData.reduce((sum, r) => sum + (r['Total Factura'] || 0), 0);
    const totalPagado = invoiceData.reduce((sum, r) => sum + (r['Pagado'] || 0), 0);
    const totalSaldo = invoiceData.reduce((sum, r) => sum + (r['Saldo Pendiente'] || 0), 0);
    
    const totalRow = invoiceData.length + 2;
    ws2[`A${totalRow}`] = { v: 'TOTALES', t: 's' };
    ws2[`D${totalRow}`] = applyCurrencyFormat(totalFactura);
    ws2[`E${totalRow}`] = applyCurrencyFormat(totalPagado);
    ws2[`F${totalRow}`] = applyCurrencyFormat(totalSaldo);
    
    // Anchos de columna
    ws2['!cols'] = [
      { wch: 18 },  // Número Factura
      { wch: 12 },  // Fecha
      { wch: 30 },  // Cliente
      { wch: 16 },  // Total Factura
      { wch: 14 },  // Pagado
      { wch: 18 },  // Saldo Pendiente
      { wch: 16 },  // Días Vencimiento
      { wch: 12 },  // Estado
      { wch: 12 }   // Vencimiento
    ];
    
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Facturas');
  }
  
  // ────────────────────────────────────────────────────────────────────────
  // HOJA 3: RESUMEN EJECUTIVO
  // ────────────────────────────────────────────────────────────────────────
  if (data.summary) {
    const summaryData = [
      { 'Métrica': 'Total Por Cobrar', 'Valor': parseFloat(data.summary.total_receivable) || 0 },
      { 'Métrica': 'Total Vencido (+30 días)', 'Valor': parseFloat(data.summary.total_overdue) || 0 },
      { 'Métrica': 'Total a Vencer (0-30 días)', 'Valor': parseFloat(data.summary.total_current) || 0 },
      { 'Métrica': 'Número de Clientes con Deuda', 'Valor': parseInt(data.summary.total_customers) || 0 },
      { 'Métrica': 'Facturas Pendientes', 'Valor': parseInt(data.summary.total_invoices) || 0 },
      { 'Métrica': 'Días Promedio de Cobro', 'Valor': Math.round(parseFloat(data.summary.avg_days) || 0) },
      { 'Métrica': '', 'Valor': '' },
      { 'Métrica': 'Fecha de Reporte', 'Valor': new Date().toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) }
    ];

    const ws3 = XLSX.utils.json_to_sheet(summaryData);
    
    // Aplicar formato de moneda a los valores monetarios
    [1, 2, 3].forEach(row => {
      const cell = `B${row + 1}`;
      if (ws3[cell] && typeof ws3[cell].v === 'number') {
        ws3[cell] = applyCurrencyFormat(ws3[cell].v);
      }
    });
    
    // Anchos de columna
    ws3['!cols'] = [
      { wch: 35 },  // Métrica
      { wch: 25 }   // Valor
    ];
    
    XLSX.utils.book_append_sheet(wb, ws3, 'Resumen Ejecutivo');
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
};


/**
 * Descargar plantilla SIMPLIFICADA de Excel para importar productos
 */
export const downloadProductsTemplate = () => {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Plantilla con ejemplo
  const templateData = [
    {
      'Código*': 'PROD001',
      'Nombre*': 'Producto de Ejemplo',
      'Costo Promedio': 10000,
      'Precio Venta': 13000,
      'Margen Utilidad (%)': 30,
      'Cantidad': 100
    },
    {
      'Código*': 'PROD002',
      'Nombre*': 'Producto Sin Costo',
      'Costo Promedio': '',
      'Precio Venta': 15000,
      'Margen Utilidad (%)': '',
      'Cantidad': 50
    },
    {
      'Código*': 'PROD003',
      'Nombre*': 'Producto Sin Cantidad',
      'Costo Promedio': 5000,
      'Precio Venta': 6500,
      'Margen Utilidad (%)': 30,
      'Cantidad': ''
    }
  ];

  // Agregar 15 filas vacías para que el usuario complete
  for (let i = 0; i < 15; i++) {
    templateData.push({
      'Código*': '',
      'Nombre*': '',
      'Costo Promedio': '',
      'Precio Venta': '',
      'Margen Utilidad (%)': '',
      'Cantidad': ''
    });
  }

  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // Anchos de columnas
  ws['!cols'] = [
    { wch: 20 },  // Código
    { wch: 35 },  // Nombre
    { wch: 18 },  // Costo Promedio
    { wch: 18 },  // Precio Venta
    { wch: 20 },  // Margen Utilidad
    { wch: 15 }   // Cantidad
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Productos');

  // Hoja 2: Instrucciones
  const instructions = [
    { '': '' },
    { '': '📋 INSTRUCCIONES PARA IMPORTAR PRODUCTOS' },
    { '': '' },
    { '': '✅ FORMATO SIMPLIFICADO' },
    { '': '' },
    { '': '1️⃣ CAMPOS OBLIGATORIOS (marcados con *)' },
    { '': '   • Código*: Código único del producto (SKU)' },
    { '': '   • Nombre*: Nombre del producto' },
    { '': '' },
    { '': '2️⃣ CAMPOS OPCIONALES (valores por defecto si están vacíos)' },
    { '': '   • Costo Promedio: Costo de compra (por defecto: 0)' },
    { '': '   • Precio Venta: Precio al público (se calcula si está vacío)' },
    { '': '   • Margen Utilidad (%): Porcentaje de ganancia (por defecto: 30%)' },
    { '': '   • Cantidad: Stock inicial (por defecto: 0)' },
    { '': '' },
    { '': '3️⃣ REGLAS AUTOMÁTICAS' },
    { '': '   • Si Costo Promedio está vacío → se pone 0' },
    { '': '   • Si Precio Venta está vacío → se calcula: Costo × (1 + Margen/100)' },
    { '': '   • Si Margen Utilidad está vacío → se pone 30%' },
    { '': '   • Si Cantidad está vacía → se pone 0' },
    { '': '   • Si el código ya existe → se omite y continúa con los demás' },
    { '': '' },
    { '': '4️⃣ EJEMPLOS' },
    { '': '   Ejemplo 1 - Producto completo:' },
    { '': '     Código: LAPTOP-001' },
    { '': '     Nombre: Laptop HP' },
    { '': '     Costo: 1000000' },
    { '': '     Precio: 1300000' },
    { '': '     Margen: 30' },
    { '': '     Cantidad: 10' },
    { '': '' },
    { '': '   Ejemplo 2 - Solo nombre y precio (sin costo):' },
    { '': '     Código: SERV-001' },
    { '': '     Nombre: Servicio de Instalación' },
    { '': '     Costo: (vacío → 0)' },
    { '': '     Precio: 50000' },
    { '': '     Margen: (vacío → 30%)' },
    { '': '     Cantidad: (vacío → 0)' },
    { '': '' },
    { '': '5️⃣ IMPORTANTE' },
    { '': '   • Los números NO deben llevar símbolos ($, %, comas)' },
    { '': '   • Ejemplo CORRECTO: 15000' },
    { '': '   • Ejemplo INCORRECTO: $15.000 o 15,000' },
    { '': '   • El margen se escribe solo el número (ej: 30 para 30%)' },
    { '': '' },
    { '': '6️⃣ RESUMEN AL FINALIZAR' },
    { '': '   Al importar verás un resumen con:' },
    { '': '   • ✅ Productos importados exitosamente' },
    { '': '   • ⚠️ Productos omitidos (códigos duplicados)' },
    { '': '   • ❌ Productos con errores' },
    { '': '' },
    { '': '7️⃣ PASOS' },
    { '': '   1. Ve a la hoja "Productos"' },
    { '': '   2. Completa mínimo Código y Nombre' },
    { '': '   3. Los demás campos son opcionales' },
    { '': '   4. Guarda el archivo (mantén formato .xlsx)' },
    { '': '   5. Importa el archivo en el sistema' },
    { '': '' },
    { '': '✅ ¡Listo para importar!' }
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructions, { skipHeader: true });
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  // Descargar
  XLSX.writeFile(wb, 'plantilla_productos_importar.xlsx');
};

/**
 * Parsear archivo de Excel importado
 */
export const parseImportedFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Leer la primera hoja
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Error al leer el archivo Excel: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Validar productos importados con NUEVO FORMATO SIMPLIFICADO
 */
export const validateImportedProducts = (data) => {
  if (!data || data.length === 0) {
    return {
      valid: false,
      validProducts: [],
      errors: [],
      summary: { total: 0, valid: 0, invalid: 0 }
    };
  }

  const errors = [];
  const validProducts = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 porque Excel empieza en 1 y hay header
    const product = {};
    const rowErrors = [];

    // ✅ VALIDAR CAMPOS OBLIGATORIOS
    
    // Código (obligatorio)
    if (!row['Código*'] || row['Código*'].toString().trim() === '') {
      rowErrors.push('Código es requerido');
    } else {
      product.sku = row['Código*'].toString().trim();
    }

    // Nombre (obligatorio)
    if (!row['Nombre*'] || row['Nombre*'].toString().trim() === '') {
      rowErrors.push('Nombre es requerido');
    } else {
      product.name = row['Nombre*'].toString().trim();
    }

    // ✅ CAMPOS OPCIONALES CON VALORES POR DEFECTO

    // Costo Promedio (por defecto: 0)
    const costoPromedio = parseFloat(row['Costo Promedio']);
    product.average_cost = !isNaN(costoPromedio) && costoPromedio >= 0 ? costoPromedio : 0;

    // Margen Utilidad (por defecto: 30%)
    const margen = parseFloat(row['Margen Utilidad (%)']);
    product.profit_margin_percentage = !isNaN(margen) && margen >= 0 ? margen : 30;

    // Precio Venta
    const precioVenta = parseFloat(row['Precio Venta']);
    if (!isNaN(precioVenta) && precioVenta >= 0) {
      // Si tiene precio de venta, usarlo
      product.base_price = precioVenta;
    } else if (product.average_cost > 0) {
      // Si no tiene precio pero tiene costo, calcularlo
      product.base_price = product.average_cost * (1 + product.profit_margin_percentage / 100);
    } else {
      // Si no tiene ni precio ni costo, poner 0
      product.base_price = 0;
    }

    // Cantidad (por defecto: 0)
    const cantidad = parseFloat(row['Cantidad']);
    product.current_stock = !isNaN(cantidad) && cantidad >= 0 ? cantidad : 0;

    // ✅ CAMPOS FIJOS PARA COMPATIBILIDAD CON EL SISTEMA
    product.unit_of_measure = 'unit';
    product.min_stock = 0;
    product.track_inventory = true;

    // ✅ AGREGAR A LA LISTA
    if (rowErrors.length > 0) {
      errors.push({
        row: rowNumber,
        sku: row['Código*'] || 'Sin código',
        name: row['Nombre*'] || 'Sin nombre',
        errors: rowErrors
      });
    } else {
      validProducts.push(product);
    }
  });

  return {
    valid: errors.length === 0,
    validProducts,
    errors,
    summary: {
      total: data.length,
      valid: validProducts.length,
      invalid: errors.length
    }
  };
};

// ========================================
// FUNCIONES DE EXPORTACIÓN
// ========================================

/**
 * Exportar productos a Excel (.xlsx) - FORMATO MEJORADO
 */
export const exportProductsToExcel = (products, filename = 'productos') => {
  const data = products.map(product => ({
    'Código': product.sku || '',
    'Nombre': product.name || '',
    'Descripción': product.description || '',
    'Categoría': product.category?.name || 'Sin categoría',
    'Stock Actual': parseFloat(product.current_stock) || 0,
    'Stock Mínimo': parseFloat(product.min_stock) || 0,
    'Unidad': product.unit_of_measure || '',
    'Costo Promedio': parseFloat(product.average_cost) || 0,
    'Precio Venta': parseFloat(product.base_price) || 0,
    'Margen (%)': parseFloat(product.profit_margin_percentage) || 0,
    'Estado': product.is_active ? 'Activo' : 'Inactivo'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Aplicar formatos de moneda
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const costoCell = `H${R + 1}`;
    const precioCell = `I${R + 1}`;
    
    if (ws[costoCell]) {
      ws[costoCell] = applyCurrencyFormat(ws[costoCell].v);
    }
    if (ws[precioCell]) {
      ws[precioCell] = applyCurrencyFormat(ws[precioCell].v);
    }
  }

  ws['!cols'] = [
    { wch: 20 },  // Código
    { wch: 30 },  // Nombre
    { wch: 40 },  // Descripción
    { wch: 20 },  // Categoría
    { wch: 12 },  // Stock Actual
    { wch: 12 },  // Stock Mínimo
    { wch: 10 },  // Unidad
    { wch: 15 },  // Costo Promedio
    { wch: 15 },  // Precio Venta
    { wch: 12 },  // Margen
    { wch: 10 }   // Estado
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Productos');

  // Resumen con formato mejorado
  const valorInventario = products.reduce((sum, p) => 
    sum + (parseFloat(p.current_stock) * parseFloat(p.average_cost || 0)), 0
  );
  
  const summary = [
    { 'Métrica': 'Total de Productos', 'Valor': products.length },
    { 'Métrica': 'Productos Activos', 'Valor': products.filter(p => p.is_active).length },
    { 'Métrica': 'Valor Total Inventario', 'Valor': valorInventario },
    { 'Métrica': 'Fecha de Exportación', 'Valor': new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) }
  ];
  
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  
  // Formato de moneda en el valor del inventario
  if (wsSummary['B3']) {
    wsSummary['B3'] = applyCurrencyFormat(wsSummary['B3'].v);
  }
  
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
};

/**
 * Exportar categorías a Excel (.xlsx)
 */
export const exportCategoriesToExcel = (categories, filename = 'categorias') => {
  const data = categories.map(category => ({
    'Nombre': category.name || '',
    'Descripción': category.description || '',
    'Categoría Padre': category.parent?.name || 'Sin padre',
    'Estado': category.is_active ? 'Activa' : 'Inactiva'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 25 },  // Nombre
    { wch: 40 },  // Descripción
    { wch: 25 },  // Categoría Padre
    { wch: 12 }   // Estado
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Categorías');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
};

/**
 * Exportar movimientos a Excel - FORMATO MEJORADO
 */
export const exportMovementsToExcel = (movements, filename = 'movimientos') => {
  const data = movements.map(mov => ({
    'Fecha': new Date(mov.created_at).toLocaleString('es-CO'),
    'Tipo': mov.movement_type,
    'Producto': mov.product?.name || '',
    'SKU': mov.product?.sku || '',
    'Cantidad': mov.quantity,
    'Costo Unitario': mov.unit_cost || 0,
    'Valor Total': (mov.quantity || 0) * (mov.unit_cost || 0),
    'Usuario': (mov.user?.first_name || '') + ' ' + (mov.user?.last_name || ''),
    'Notas': mov.notes || ''
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Aplicar formato de moneda
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const costoCell = `F${R + 1}`;
    const valorCell = `G${R + 1}`;
    
    if (ws[costoCell]) {
      ws[costoCell] = applyCurrencyFormat(ws[costoCell].v);
    }
    if (ws[valorCell]) {
      ws[valorCell] = applyCurrencyFormat(ws[valorCell].v);
    }
  }

  ws['!cols'] = [
    { wch: 20 },  // Fecha
    { wch: 15 },  // Tipo
    { wch: 30 },  // Producto
    { wch: 15 },  // SKU
    { wch: 10 },  // Cantidad
    { wch: 15 },  // Costo Unitario
    { wch: 15 },  // Valor Total
    { wch: 25 },  // Usuario
    { wch: 40 }   // Notas
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
};

/**
 * Exportar compras a Excel - FORMATO MEJORADO
 */
export const exportPurchasesToExcel = (purchases, filename = 'compras') => {
  const purchasesData = purchases.map(purchase => ({
    'Número': purchase.purchase_number,
    'Fecha': new Date(purchase.purchase_date).toLocaleDateString('es-CO'),
    'Proveedor': purchase.supplier?.name || '',
    'Total Items': purchase.items?.length || 0,
    'Total': purchase.total_amount || 0,
    'Estado': purchase.status
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(purchasesData);
  
  // Aplicar formato de moneda
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const totalCell = `E${R + 1}`;
    if (ws[totalCell]) {
      ws[totalCell] = applyCurrencyFormat(ws[totalCell].v);
    }
  }

  ws['!cols'] = [
    { wch: 15 },  // Número
    { wch: 12 },  // Fecha
    { wch: 25 },  // Proveedor
    { wch: 12 },  // Total Items
    { wch: 15 },  // Total
    { wch: 12 }   // Estado
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Compras');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
};