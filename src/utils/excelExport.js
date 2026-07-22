/**
 * Exportar e Importar datos en formato Excel (.xlsx)
 * Versión mejorada con formatos profesionales
 */

import ExcelJS from 'exceljs';

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

const CURRENCY_FORMAT = '"$"#,##0';

/**
 * Descargar un workbook de ExcelJS como archivo .xlsx en el navegador
 */
const downloadWorkbook = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * Crear una hoja a partir de un arreglo de objetos, usando las llaves
 * del primer objeto como encabezados de columna
 */
const addSheetFromObjects = (workbook, sheetName, rows) => {
  const sheet = workbook.addWorksheet(sheetName);
  if (rows.length === 0) return sheet;

  const headers = Object.keys(rows[0]);
  sheet.columns = headers.map((header) => ({ header, key: header }));
  rows.forEach((row) => sheet.addRow(row));
  return sheet;
};

/**
 * Aplicar formato de moneda a una celda de una columna, para todas las
 * filas de datos (sin incluir el encabezado)
 */
const applyCurrencyColumn = (sheet, columnKey) => {
  const column = sheet.getColumn(columnKey);
  column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber === 1) return; // encabezado
    if (typeof cell.value === 'number') {
      cell.numFmt = CURRENCY_FORMAT;
    }
  });
};

// ============================================================================
// FUNCIONES DE EXPORTACIÓN MEJORADAS
// ============================================================================

/**
 * EXPORTAR CARTERA (CUENTAS POR COBRAR) - FORMATO PROFESIONAL
 */
export const exportReceivablesToExcel = async (data, filename = 'cartera') => {
  const wb = new ExcelJS.Workbook();

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

    const ws1 = addSheetFromObjects(wb, 'Resumen por Cliente', customerData);
    applyCurrencyColumn(ws1, 'Total Por Cobrar');
    applyCurrencyColumn(ws1, 'Vencido');

    // Totales
    const totalPendiente = customerData.reduce((sum, r) => sum + (r['Total Por Cobrar'] || 0), 0);
    const totalVencido = customerData.reduce((sum, r) => sum + (r['Vencido'] || 0), 0);
    const totalFacturas = customerData.reduce((sum, r) => sum + (r['Facturas Pendientes'] || 0), 0);

    const totalRow = ws1.addRow({
      'Cliente': 'TOTALES',
      'Total Por Cobrar': totalPendiente,
      'Facturas Pendientes': totalFacturas,
      'Vencido': totalVencido
    });
    totalRow.getCell('Total Por Cobrar').numFmt = CURRENCY_FORMAT;
    totalRow.getCell('Vencido').numFmt = CURRENCY_FORMAT;

    // Anchos de columna
    ws1.getColumn('Cliente').width = 30;
    ws1.getColumn('NIT/CC').width = 15;
    ws1.getColumn('Total Por Cobrar').width = 18;
    ws1.getColumn('Facturas Pendientes').width = 18;
    ws1.getColumn('Días Promedio').width = 15;
    ws1.getColumn('Vencido').width = 18;
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

    const ws2 = addSheetFromObjects(wb, 'Detalle Facturas', invoiceData);
    applyCurrencyColumn(ws2, 'Total Factura');
    applyCurrencyColumn(ws2, 'Pagado');
    applyCurrencyColumn(ws2, 'Saldo Pendiente');

    // Totales
    const totalFactura = invoiceData.reduce((sum, r) => sum + (r['Total Factura'] || 0), 0);
    const totalPagado = invoiceData.reduce((sum, r) => sum + (r['Pagado'] || 0), 0);
    const totalSaldo = invoiceData.reduce((sum, r) => sum + (r['Saldo Pendiente'] || 0), 0);

    const totalRow = ws2.addRow({
      'Número Factura': 'TOTALES',
      'Total Factura': totalFactura,
      'Pagado': totalPagado,
      'Saldo Pendiente': totalSaldo
    });
    totalRow.getCell('Total Factura').numFmt = CURRENCY_FORMAT;
    totalRow.getCell('Pagado').numFmt = CURRENCY_FORMAT;
    totalRow.getCell('Saldo Pendiente').numFmt = CURRENCY_FORMAT;

    // Anchos de columna
    ws2.getColumn('Número Factura').width = 18;
    ws2.getColumn('Fecha').width = 12;
    ws2.getColumn('Cliente').width = 30;
    ws2.getColumn('Total Factura').width = 16;
    ws2.getColumn('Pagado').width = 14;
    ws2.getColumn('Saldo Pendiente').width = 18;
    ws2.getColumn('Días Vencimiento').width = 16;
    ws2.getColumn('Estado').width = 12;
    ws2.getColumn('Vencimiento').width = 12;
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

    const ws3 = addSheetFromObjects(wb, 'Resumen Ejecutivo', summaryData);

    // Aplicar formato de moneda a los valores monetarios (primeras 3 métricas)
    for (let i = 2; i <= 4; i++) {
      const cell = ws3.getRow(i).getCell('Valor');
      if (typeof cell.value === 'number') {
        cell.numFmt = CURRENCY_FORMAT;
      }
    }

    // Anchos de columna
    ws3.getColumn('Métrica').width = 35;
    ws3.getColumn('Valor').width = 25;
  }

  const timestamp = new Date().toISOString().split('T')[0];
  await downloadWorkbook(wb, `${filename}_${timestamp}.xlsx`);
};


/**
 * Descargar plantilla SIMPLIFICADA de Excel para importar productos
 */
export const downloadProductsTemplate = async () => {
  const wb = new ExcelJS.Workbook();

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

  const ws = addSheetFromObjects(wb, 'Productos', templateData);

  // Anchos de columnas
  ws.getColumn('Código*').width = 20;
  ws.getColumn('Nombre*').width = 35;
  ws.getColumn('Costo Promedio').width = 18;
  ws.getColumn('Precio Venta').width = 18;
  ws.getColumn('Margen Utilidad (%)').width = 20;
  ws.getColumn('Cantidad').width = 15;

  // Hoja 2: Instrucciones
  const instructions = [
    '',
    '📋 INSTRUCCIONES PARA IMPORTAR PRODUCTOS',
    '',
    '✅ FORMATO SIMPLIFICADO',
    '',
    '1️⃣ CAMPOS OBLIGATORIOS (marcados con *)',
    '   • Código*: Código único del producto (SKU)',
    '   • Nombre*: Nombre del producto',
    '',
    '2️⃣ CAMPOS OPCIONALES (valores por defecto si están vacíos)',
    '   • Costo Promedio: Costo de compra (por defecto: 0)',
    '   • Precio Venta: Precio al público (se calcula si está vacío)',
    '   • Margen Utilidad (%): Porcentaje de ganancia (por defecto: 30%)',
    '   • Cantidad: Stock inicial (por defecto: 0)',
    '',
    '3️⃣ REGLAS AUTOMÁTICAS',
    '   • Si Costo Promedio está vacío → se pone 0',
    '   • Si Precio Venta está vacío → se calcula: Costo × (1 + Margen/100)',
    '   • Si Margen Utilidad está vacío → se pone 30%',
    '   • Si Cantidad está vacía → se pone 0',
    '   • Si el código ya existe → se omite y continúa con los demás',
    '',
    '4️⃣ EJEMPLOS',
    '   Ejemplo 1 - Producto completo:',
    '     Código: LAPTOP-001',
    '     Nombre: Laptop HP',
    '     Costo: 1000000',
    '     Precio: 1300000',
    '     Margen: 30',
    '     Cantidad: 10',
    '',
    '   Ejemplo 2 - Solo nombre y precio (sin costo):',
    '     Código: SERV-001',
    '     Nombre: Servicio de Instalación',
    '     Costo: (vacío → 0)',
    '     Precio: 50000',
    '     Margen: (vacío → 30%)',
    '     Cantidad: (vacío → 0)',
    '',
    '5️⃣ IMPORTANTE',
    '   • Los números NO deben llevar símbolos ($, %, comas)',
    '   • Ejemplo CORRECTO: 15000',
    '   • Ejemplo INCORRECTO: $15.000 o 15,000',
    '   • El margen se escribe solo el número (ej: 30 para 30%)',
    '',
    '6️⃣ RESUMEN AL FINALIZAR',
    '   Al importar verás un resumen con:',
    '   • ✅ Productos importados exitosamente',
    '   • ⚠️ Productos omitidos (códigos duplicados)',
    '   • ❌ Productos con errores',
    '',
    '7️⃣ PASOS',
    '   1. Ve a la hoja "Productos"',
    '   2. Completa mínimo Código y Nombre',
    '   3. Los demás campos son opcionales',
    '   4. Guarda el archivo (mantén formato .xlsx)',
    '   5. Importa el archivo en el sistema',
    '',
    '✅ ¡Listo para importar!'
  ];

  const wsInstructions = wb.addWorksheet('Instrucciones');
  instructions.forEach((line) => wsInstructions.addRow([line]));
  wsInstructions.getColumn(1).width = 80;

  // Descargar
  await downloadWorkbook(wb, 'plantilla_productos_importar.xlsx');
};

/**
 * Parsear archivo de Excel importado
 */
export const parseImportedFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(e.target.result);

        // Leer la primera hoja
        const sheet = wb.worksheets[0];
        const headers = [];
        sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
          headers[colNumber] = cell.value;
        });

        const jsonData = [];
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // encabezado

          const obj = {};
          let hasValue = false;
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const key = headers[colNumber];
            if (!key) return;
            const value = cell.value;
            obj[key] = value;
            if (value !== null && value !== undefined && value !== '') {
              hasValue = true;
            }
          });

          if (hasValue) {
            jsonData.push(obj);
          }
        });

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
// SALDOS INICIALES (cartera / CxP / inventario)
// ========================================

const buildOpeningBalanceTemplate = (sheetName, filename, exampleRow, instructions) => async () => {
  const wb = new ExcelJS.Workbook();
  const templateData = [exampleRow];
  for (let i = 0; i < 15; i++) {
    const blankRow = {};
    Object.keys(exampleRow).forEach((key) => { blankRow[key] = ''; });
    templateData.push(blankRow);
  }

  const ws = addSheetFromObjects(wb, sheetName, templateData);
  Object.keys(exampleRow).forEach((key) => { ws.getColumn(key).width = Math.max(18, key.length + 4); });

  const wsInstructions = wb.addWorksheet('Instrucciones');
  instructions.forEach((line) => wsInstructions.addRow([line]));
  wsInstructions.getColumn(1).width = 80;

  await downloadWorkbook(wb, filename);
};

/**
 * Plantilla para saldo inicial de cartera (deuda de un cliente que ya existía
 * antes de Pitbox). Se empareja por NIT/Cédula contra los clientes ya
 * registrados — el cliente debe existir de antemano.
 */
export const downloadOpeningReceivableTemplate = buildOpeningBalanceTemplate(
  'Saldos Cartera',
  'plantilla_saldos_iniciales_cartera.xlsx',
  {
    'NIT/Cédula*': '900123456',
    'Referencia': 'FAC-0001',
    'Fecha*': '2026-01-01',
    'Fecha Vencimiento': '2026-02-01',
    'Monto*': 500000,
    'Descripción': 'Saldo pendiente antes de Pitbox',
  },
  [
    '',
    '📋 INSTRUCCIONES — SALDOS INICIALES DE CARTERA',
    '',
    '1️⃣ El cliente debe existir ya en Pitbox — se empareja por NIT/Cédula.',
    '2️⃣ Campos obligatorios: NIT/Cédula, Fecha (de la deuda original), Monto.',
    '3️⃣ Referencia y Descripción son opcionales, solo para identificar la deuda.',
    '4️⃣ Fecha y Fecha Vencimiento en formato AAAA-MM-DD.',
    '5️⃣ Cada fila genera un asiento contable real contra la cuenta puente.',
  ]
);

/**
 * Plantilla para saldo inicial de cuentas por pagar (deuda con un proveedor
 * que ya existía antes de Pitbox). Se empareja por NIT contra los
 * proveedores ya registrados.
 */
export const downloadOpeningPayableTemplate = buildOpeningBalanceTemplate(
  'Saldos CxP',
  'plantilla_saldos_iniciales_cxp.xlsx',
  {
    'NIT*': '900654321',
    'Referencia': 'FACT-PROV-0001',
    'Fecha*': '2026-01-01',
    'Fecha Vencimiento': '2026-02-01',
    'Monto*': 300000,
    'Descripción': 'Saldo pendiente con proveedor antes de Pitbox',
  },
  [
    '',
    '📋 INSTRUCCIONES — SALDOS INICIALES DE CUENTAS POR PAGAR',
    '',
    '1️⃣ El proveedor debe existir ya en Pitbox — se empareja por NIT.',
    '2️⃣ Campos obligatorios: NIT, Fecha (de la deuda original), Monto.',
    '3️⃣ Referencia y Descripción son opcionales, solo para identificar la deuda.',
    '4️⃣ Fecha y Fecha Vencimiento en formato AAAA-MM-DD.',
    '5️⃣ Cada fila genera un asiento contable real contra la cuenta puente.',
  ]
);

/**
 * Plantilla para saldo inicial de inventario (existencias físicas antes de
 * Pitbox, con su costo). Se empareja por SKU contra los productos ya
 * registrados; Bodega es opcional si el producto ya tiene una asignada.
 */
export const downloadOpeningInventoryTemplate = buildOpeningBalanceTemplate(
  'Inventario Inicial',
  'plantilla_saldo_inicial_inventario.xlsx',
  {
    'SKU*': 'PROD001',
    'Cantidad*': 10,
    'Costo Unitario*': 15000,
  },
  [
    '',
    '📋 INSTRUCCIONES — SALDO INICIAL DE INVENTARIO',
    '',
    '1️⃣ El producto debe existir ya en Pitbox — se empareja por SKU (Código).',
    '2️⃣ Campos obligatorios: SKU, Cantidad, Costo Unitario.',
    '3️⃣ El producto debe tener una bodega ya asignada (se usa esa).',
    '4️⃣ Los números no deben llevar símbolos ($, %, comas).',
    '5️⃣ Se genera un solo asiento contable con el valor total del lote.',
  ]
);

/**
 * Valida filas de saldo inicial de cartera contra la lista de clientes ya
 * cargada (empareja por tax_id). Formato de error `{ row, identifier, errors }`
 * para calzar con ImportOpeningBalanceRowsModal.jsx.
 */
export const validateImportedOpeningReceivableRows = (data, customers) => {
  if (!data || data.length === 0) {
    return { validRows: [], errors: [], summary: { total: 0, valid: 0, invalid: 0 } };
  }

  const byTaxId = new Map((customers || []).map((c) => [String(c.tax_id || '').trim(), c]));
  const errors = [];
  const validRows = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowErrors = [];
    const taxId = row['NIT/Cédula*'] ? String(row['NIT/Cédula*']).trim() : '';
    const customer = taxId ? byTaxId.get(taxId) : null;

    if (!taxId) rowErrors.push('NIT/Cédula es requerido');
    else if (!customer) rowErrors.push(`No existe un cliente con NIT/Cédula "${taxId}"`);

    const amount = parseFloat(row['Monto*']);
    if (!(amount > 0)) rowErrors.push('Monto debe ser mayor a 0');

    const issueDate = row['Fecha*'];
    if (!issueDate) rowErrors.push('Fecha es requerida');

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, identifier: taxId || 'Sin NIT', errors: rowErrors });
    } else {
      validRows.push({
        customer_id: customer.id,
        total_amount: amount,
        issue_date: toIsoDate(issueDate),
        due_date: row['Fecha Vencimiento'] ? toIsoDate(row['Fecha Vencimiento']) : null,
        reference: row['Referencia'] ? String(row['Referencia']).trim() : null,
        description: row['Descripción'] ? String(row['Descripción']).trim() : null,
      });
    }
  });

  return { validRows, errors, summary: { total: data.length, valid: validRows.length, invalid: errors.length } };
};

/**
 * Simétrico a validateImportedOpeningReceivableRows, para proveedores/CxP.
 */
export const validateImportedOpeningPayableRows = (data, suppliers) => {
  if (!data || data.length === 0) {
    return { validRows: [], errors: [], summary: { total: 0, valid: 0, invalid: 0 } };
  }

  const byTaxId = new Map((suppliers || []).map((s) => [String(s.tax_id || '').trim(), s]));
  const errors = [];
  const validRows = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowErrors = [];
    const taxId = row['NIT*'] ? String(row['NIT*']).trim() : '';
    const supplier = taxId ? byTaxId.get(taxId) : null;

    if (!taxId) rowErrors.push('NIT es requerido');
    else if (!supplier) rowErrors.push(`No existe un proveedor con NIT "${taxId}"`);

    const amount = parseFloat(row['Monto*']);
    if (!(amount > 0)) rowErrors.push('Monto debe ser mayor a 0');

    const issueDate = row['Fecha*'];
    if (!issueDate) rowErrors.push('Fecha es requerida');

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, identifier: taxId || 'Sin NIT', errors: rowErrors });
    } else {
      validRows.push({
        supplier_id: supplier.id,
        total_amount: amount,
        issue_date: toIsoDate(issueDate),
        due_date: row['Fecha Vencimiento'] ? toIsoDate(row['Fecha Vencimiento']) : null,
        reference: row['Referencia'] ? String(row['Referencia']).trim() : null,
        description: row['Descripción'] ? String(row['Descripción']).trim() : null,
      });
    }
  });

  return { validRows, errors, summary: { total: data.length, valid: validRows.length, invalid: errors.length } };
};

/**
 * Valida filas de saldo inicial de inventario contra la lista de productos ya
 * cargada (empareja por SKU). Si la fila no trae bodega, usa la ya asignada
 * al producto (product.warehouse_id).
 */
export const validateImportedOpeningInventory = (data, products) => {
  if (!data || data.length === 0) {
    return { validRows: [], errors: [], summary: { total: 0, valid: 0, invalid: 0 } };
  }

  const bySku = new Map((products || []).map((p) => [String(p.sku || '').trim(), p]));
  const errors = [];
  const validRows = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowErrors = [];
    const sku = row['SKU*'] ? String(row['SKU*']).trim() : '';
    const product = sku ? bySku.get(sku) : null;

    if (!sku) rowErrors.push('SKU es requerido');
    else if (!product) rowErrors.push(`No existe un producto con SKU "${sku}"`);

    const quantity = parseFloat(row['Cantidad*']);
    if (!(quantity > 0)) rowErrors.push('Cantidad debe ser mayor a 0');

    const unitCost = parseFloat(row['Costo Unitario*']);
    if (!(unitCost >= 0)) rowErrors.push('Costo Unitario debe ser mayor o igual a 0');

    const warehouseId = product?.warehouse_id || null;
    if (product && !warehouseId) rowErrors.push(`El producto "${product.name || sku}" no tiene bodega asignada en Pitbox`);

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, identifier: sku || 'Sin SKU', errors: rowErrors });
    } else {
      validRows.push({
        product_id: product.id,
        warehouse_id: warehouseId,
        quantity,
        unit_cost: unitCost,
      });
    }
  });

  return { validRows, errors, summary: { total: data.length, valid: validRows.length, invalid: errors.length } };
};

// Convierte una fecha proveniente de ExcelJS (puede venir como Date o string)
// a 'YYYY-MM-DD' — ExcelJS parsea columnas de fecha como objetos Date.
function toIsoDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim().slice(0, 10);
}

// ========================================
// FUNCIONES DE EXPORTACIÓN
// ========================================

/**
 * Exportar productos a Excel (.xlsx) - FORMATO MEJORADO
 */
export const exportProductsToExcel = async (products, filename = 'productos') => {
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

  const wb = new ExcelJS.Workbook();
  const ws = addSheetFromObjects(wb, 'Productos', data);

  // Aplicar formatos de moneda
  applyCurrencyColumn(ws, 'Costo Promedio');
  applyCurrencyColumn(ws, 'Precio Venta');

  ws.getColumn('Código').width = 20;
  ws.getColumn('Nombre').width = 30;
  ws.getColumn('Descripción').width = 40;
  ws.getColumn('Categoría').width = 20;
  ws.getColumn('Stock Actual').width = 12;
  ws.getColumn('Stock Mínimo').width = 12;
  ws.getColumn('Unidad').width = 10;
  ws.getColumn('Costo Promedio').width = 15;
  ws.getColumn('Precio Venta').width = 15;
  ws.getColumn('Margen (%)').width = 12;
  ws.getColumn('Estado').width = 10;

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

  const wsSummary = addSheetFromObjects(wb, 'Resumen', summary);

  // Formato de moneda en el valor del inventario (fila 3: "Valor Total Inventario")
  const inventoryCell = wsSummary.getRow(3).getCell('Valor');
  if (typeof inventoryCell.value === 'number') {
    inventoryCell.numFmt = CURRENCY_FORMAT;
  }

  wsSummary.getColumn('Métrica').width = 30;
  wsSummary.getColumn('Valor').width = 30;

  const timestamp = new Date().toISOString().split('T')[0];
  await downloadWorkbook(wb, `${filename}_${timestamp}.xlsx`);
};

/**
 * Exportar categorías a Excel (.xlsx)
 */
export const exportCategoriesToExcel = async (categories, filename = 'categorias') => {
  const data = categories.map(category => ({
    'Nombre': category.name || '',
    'Descripción': category.description || '',
    'Categoría Padre': category.parent?.name || 'Sin padre',
    'Estado': category.is_active ? 'Activa' : 'Inactiva'
  }));

  const wb = new ExcelJS.Workbook();
  const ws = addSheetFromObjects(wb, 'Categorías', data);

  ws.getColumn('Nombre').width = 25;
  ws.getColumn('Descripción').width = 40;
  ws.getColumn('Categoría Padre').width = 25;
  ws.getColumn('Estado').width = 12;

  const timestamp = new Date().toISOString().split('T')[0];
  await downloadWorkbook(wb, `${filename}_${timestamp}.xlsx`);
};

/**
 * Exportar movimientos a Excel - FORMATO MEJORADO
 */
export const exportMovementsToExcel = async (movements, filename = 'movimientos') => {
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

  const wb = new ExcelJS.Workbook();
  const ws = addSheetFromObjects(wb, 'Movimientos', data);

  // Aplicar formato de moneda
  applyCurrencyColumn(ws, 'Costo Unitario');
  applyCurrencyColumn(ws, 'Valor Total');

  ws.getColumn('Fecha').width = 20;
  ws.getColumn('Tipo').width = 15;
  ws.getColumn('Producto').width = 30;
  ws.getColumn('SKU').width = 15;
  ws.getColumn('Cantidad').width = 10;
  ws.getColumn('Costo Unitario').width = 15;
  ws.getColumn('Valor Total').width = 15;
  ws.getColumn('Usuario').width = 25;
  ws.getColumn('Notas').width = 40;

  const timestamp = new Date().toISOString().split('T')[0];
  await downloadWorkbook(wb, `${filename}_${timestamp}.xlsx`);
};

/**
 * Exportar compras a Excel - FORMATO MEJORADO
 */
export const exportPurchasesToExcel = async (purchases, filename = 'compras') => {
  const purchasesData = purchases.map(purchase => ({
    'Número': purchase.purchase_number,
    'Fecha': new Date(purchase.purchase_date).toLocaleDateString('es-CO'),
    'Proveedor': purchase.supplier?.name || '',
    'Total Items': purchase.items?.length || 0,
    'Total': purchase.total_amount || 0,
    'Estado': purchase.status
  }));

  const wb = new ExcelJS.Workbook();
  const ws = addSheetFromObjects(wb, 'Compras', purchasesData);

  // Aplicar formato de moneda
  applyCurrencyColumn(ws, 'Total');

  ws.getColumn('Número').width = 15;
  ws.getColumn('Fecha').width = 12;
  ws.getColumn('Proveedor').width = 25;
  ws.getColumn('Total Items').width = 12;
  ws.getColumn('Total').width = 15;
  ws.getColumn('Estado').width = 12;

  const timestamp = new Date().toISOString().split('T')[0];
  await downloadWorkbook(wb, `${filename}_${timestamp}.xlsx`);
};
