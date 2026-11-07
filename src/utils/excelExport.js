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
 * Descargar plantilla de Excel para importar productos.
 * Las columnas deben coincidir con COLUMN_ALIASES de
 * backend/src/controllers/inventory/productsBulkImport.controller.js.
 * @param {Array} categories categorías del tenant (opcional) para listarlas
 *                           en una hoja de referencia.
 */
export const downloadProductsTemplate = async (categories = []) => {
  const wb = new ExcelJS.Workbook();

  const columns = [
    { header: 'Código*', width: 18 },
    { header: 'Nombre*', width: 35 },
    { header: 'Categoría', width: 26 },
    { header: 'Tipo', width: 15 },
    { header: 'Marca', width: 16 },
    { header: 'Código de barras', width: 18 },
    { header: 'Descripción', width: 30 },
    { header: 'Unidad', width: 13 },
    { header: 'Costo', width: 14 },
    { header: 'Margen Utilidad (%)', width: 20 },
    { header: 'Precio Venta', width: 15 },
    { header: 'Precio incluye IVA', width: 18 },
    { header: 'IVA', width: 11 },
    { header: 'INC (%)', width: 10 },
    { header: 'Cantidad', width: 11 },
    { header: 'Stock mínimo', width: 14 },
    { header: 'Stock máximo', width: 14 },
    { header: 'Permitir stock negativo', width: 22 },
    { header: 'Equivalente(s)', width: 22 },
  ];

  const examples = [
    {
      'Código*': 'FIL-001', 'Nombre*': 'Filtro de aceite', 'Categoría': 'Filtros', 'Tipo': 'Producto',
      'Marca': 'Bosch', 'Código de barras': '7701234567890', 'Unidad': 'Unidad', 'Costo': 18000,
      'Margen Utilidad (%)': 30, 'Precio incluye IVA': 'No', 'IVA': '19', 'Cantidad': 20,
      'Stock mínimo': 5, 'Equivalente(s)': 'FIL-002',
    },
    {
      'Código*': 'FIL-002', 'Nombre*': 'Filtro de aceite alterno', 'Categoría': 'Filtros', 'Tipo': 'Producto',
      'Marca': 'Mann', 'Unidad': 'Unidad', 'Costo': 16000, 'IVA': '19', 'Cantidad': 10,
    },
    {
      'Código*': 'ACE-20W50', 'Nombre*': 'Aceite 20W50 galón', 'Categoría': 'Lubricantes > Aceites de motor',
      'Tipo': 'Producto', 'Unidad': 'Galón', 'Costo': 85000, 'Precio Venta': 119000,
      'Precio incluye IVA': 'Sí', 'IVA': '19', 'Cantidad': 12, 'Permitir stock negativo': 'No',
    },
    {
      'Código*': 'MO-ALIN', 'Nombre*': 'Alineación', 'Categoría': 'Servicios', 'Tipo': 'Mano de obra',
      'Precio Venta': 60000, 'IVA': '19',
    },
  ];

  const ws = wb.addWorksheet('Productos');
  ws.columns = columns.map((c) => ({ header: c.header, key: c.header, width: c.width }));
  examples.forEach((row) => ws.addRow(row));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Listas desplegables (Excel las muestra; el backend igual valida el texto).
  const lastRow = 1000;
  const listValidation = (header, values) => {
    const col = ws.getColumn(header).letter;
    for (let r = 2; r <= lastRow; r++) {
      ws.getCell(`${col}${r}`).dataValidation = {
        type: 'list', allowBlank: true, formulae: [`"${values.join(',')}"`],
      };
    }
  };
  listValidation('Tipo', ['Producto', 'Servicio', 'Mano de obra']);
  listValidation('IVA', ['19', '5', 'Exento', 'Excluido']);
  listValidation('Precio incluye IVA', ['Sí', 'No']);
  listValidation('Permitir stock negativo', ['Sí', 'No']);
  listValidation('Unidad', ['Unidad', 'Kilogramo', 'Gramo', 'Libra', 'Litro', 'Mililitro', 'Galón', 'Metro', 'Centímetro', 'Caja', 'Paquete', 'Docena']);

  // Hoja 2: Instrucciones
  const instructions = [
    '',
    '📋 INSTRUCCIONES PARA IMPORTAR PRODUCTOS',
    '',
    '1️⃣ CAMPOS OBLIGATORIOS (marcados con *)',
    '   • Código*: Código único del producto (SKU, máx. 50 caracteres)',
    '   • Nombre*: Nombre del producto (máx. 200 caracteres)',
    '',
    '2️⃣ CATEGORÍA',
    '   • Escribe el nombre de la categoría (no importan mayúsculas ni tildes).',
    '   • Si la categoría NO existe, se crea automáticamente al importar.',
    '     Antes de importar, la validación te muestra cuáles se van a crear.',
    '   • Para crearla dentro de otra, escribe "Padre > Hija"',
    '     (ej. "Lubricantes > Aceites de motor"). Si la hija ya existe, se usa',
    '     la existente sin importar en qué categoría padre esté.',
    '   • Vacía → el producto queda sin categoría.',
    '   • En la hoja "Categorías" ves las que ya existen.',
    '',
    '3️⃣ TIPO',
    '   • Producto (por defecto): maneja inventario y stock.',
    '   • Servicio: sin inventario (Cantidad, stock mínimo/máximo no aplican).',
    '   • Mano de obra: servicio que en una OT se carga como mano de obra',
    '     (aplica comisión a técnico).',
    '   • Los vehículos no se importan: créalos desde el formulario.',
    '',
    '4️⃣ COSTO, MARGEN Y PRECIO',
    '   • Costo: costo unitario sin IVA (por defecto 0).',
    '   • Margen Utilidad (%): si lo dejas vacío, el producto HEREDA el margen',
    '     de su categoría (o el margen global). Si no hay ninguno, queda en 30 %.',
    '   • Precio Venta: si está vacío y hay costo, se calcula con Costo y Margen',
    '     según el cálculo elegido en Categorías → Márgenes de ganancia:',
    '     sobre la venta: Costo ÷ (1 − Margen/100) · sobre el costo: Costo × (1 + Margen/100)',
    '   • Precio incluye IVA: "Sí" si el Precio Venta ya trae los impuestos',
    '     (también el calculado los incluye). Por defecto: No.',
    '',
    '5️⃣ IMPUESTOS',
    '   • IVA: 19 (por defecto), 5, Exento (IVA 0 %) o Excluido (no causa IVA).',
    '   • INC (%): impoconsumo, solo si aplica (licores, bebidas, etc.).',
    '',
    '6️⃣ INVENTARIO',
    '   • Cantidad: stock inicial. Entra a la bodega principal con su',
    '     movimiento de kardex y asiento contable, valorizado al Costo.',
    '   • Stock mínimo / Stock máximo: opcionales (el máximo no puede ser',
    '     menor que el mínimo).',
    '   • Permitir stock negativo: Sí / No (por defecto No).',
    '',
    '7️⃣ OTROS CAMPOS OPCIONALES',
    '   • Marca, Descripción.',
    '   • Código de barras: único; si ya lo tiene otro producto, la fila falla.',
    '   • Unidad: Unidad (por defecto), Kilogramo, Gramo, Libra, Onza, Litro,',
    '     Mililitro, Galón, Metro, Centímetro, Pie, Caja, Paquete, Docena.',
    '   • Equivalente(s): código(s) de producto(s) sustitutos, separados por "|"',
    '     (ej. "PROD010|PROD011"). Puede ser un código de otra fila de este',
    '     mismo archivo o el de un producto que ya existe. Basta con declararlo',
    '     en UNA de las dos filas; los grupos se arman solos.',
    '',
    '8️⃣ IMPORTANTE',
    '   • Si el código ya existe → la fila se omite (no se modifica el producto).',
    '   • Los números sin símbolos ni separadores de miles: 15000, no $15.000.',
    '   • El margen se escribe solo el número (ej: 30 para 30 %).',
    '   • Una fila con un dato inválido no se importa; las demás sí.',
    '   • Columnas con otros nombres se ignoran (la validación te las muestra).',
    '   • Las filas de ejemplo de la hoja "Productos" se importan si no las borras.',
    '',
    '9️⃣ PASOS',
    '   1. Completa la hoja "Productos" (mínimo Código y Nombre).',
    '   2. Guarda el archivo en formato .xlsx.',
    '   3. Súbelo, revisa la validación y confirma la importación.',
  ];

  const wsInstructions = wb.addWorksheet('Instrucciones');
  instructions.forEach((line) => wsInstructions.addRow([line]));
  wsInstructions.getColumn(1).width = 85;

  // Hoja 3: categorías existentes (referencia)
  const wsCategories = wb.addWorksheet('Categorías');
  wsCategories.columns = [
    { header: 'Categoría', key: 'name', width: 32 },
    { header: 'Categoría padre', key: 'parent', width: 32 },
  ];
  wsCategories.getRow(1).font = { bold: true };
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  [...categories]
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'))
    .forEach((c) => wsCategories.addRow({ name: c.name, parent: (c.parent_id && nameById.get(c.parent_id)) || c.parent?.name || '' }));

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

// ========================================
// LÍNEAS DE UNA COMPRA (Nueva compra → Importar desde Excel)
// ========================================

// Encabezados de la plantilla. El código se busca como SKU, código de barras
// o código del proveedor (POST /inventory/purchases/resolve-products).
export const PURCHASE_LINES_COLUMNS = {
  code: 'Código*',
  quantity: 'Cantidad*',
  unitCost: 'Costo Unitario*',
  tax: 'IVA (%)',
  discount: 'Descuento (%)',
  margin: 'Margen (%)',
};

export const downloadPurchaseLinesTemplate = buildOpeningBalanceTemplate(
  'Lineas compra',
  'plantilla_lineas_compra.xlsx',
  {
    [PURCHASE_LINES_COLUMNS.code]: 'PROD001',
    [PURCHASE_LINES_COLUMNS.quantity]: 10,
    [PURCHASE_LINES_COLUMNS.unitCost]: 12000,
    [PURCHASE_LINES_COLUMNS.tax]: 19,
    [PURCHASE_LINES_COLUMNS.discount]: '',
    [PURCHASE_LINES_COLUMNS.margin]: 35,
  },
  [
    '',
    '📋 INSTRUCCIONES — LÍNEAS DE UNA COMPRA',
    '',
    '1️⃣ El producto debe existir en Pitbox. El Código puede ser el SKU, el código de barras',
    '   o el código con que el proveedor elegido identifica el producto.',
    '2️⃣ Obligatorios: Código, Cantidad y Costo Unitario (sin IVA).',
    '3️⃣ IVA (%) vacío → el IVA del producto. Descuento (%) vacío → 0.',
    '4️⃣ Margen (%) vacío → el producto conserva su margen. Si lo escribes, al RECIBIR la compra',
    '   pasa a ser el margen del producto y el precio de venta se calcula con él.',
    '5️⃣ Los números no deben llevar símbolos ($, %, puntos de miles).',
    '6️⃣ Si un código está repetido, se usa la última fila.',
  ]
);

/**
 * Plantilla de la lista de materiales (BOM) de un proyecto. La hoja de datos
 * va solo con encabezados: una fila de ejemplo se importaría como material
 * real. Los encabezados son los que reconoce backend/src/services/projects/bomParser.js.
 */
export const downloadProjectBomTemplate = async (projectCode = '') => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Materiales');
  ws.columns = [
    { header: 'Código', key: 'code', width: 18 },
    { header: 'Descripción', key: 'description', width: 48 },
    { header: 'Cantidad', key: 'quantity', width: 12 },
    { header: 'Unidad', key: 'unit', width: 10 },
    { header: 'Costo unitario', key: 'unit_cost', width: 16 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
  ws.getColumn('quantity').numFmt = '#,##0.####';
  ws.getColumn('unit_cost').numFmt = CURRENCY_FORMAT;
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const wsInstructions = wb.addWorksheet('Instrucciones');
  [
    '📋 INSTRUCCIONES — LISTA DE MATERIALES DEL PROYECTO',
    '',
    '1️⃣ Una fila por material, empezando en la fila 2 de la hoja "Materiales". No cambies los encabezados.',
    '2️⃣ Código: SKU, código de barras o código del proveedor. Si no lo tienes, deja solo la Descripción:',
    '   se busca el producto por nombre parecido y lo confirmas al cargar.',
    '3️⃣ Obligatorio: Cantidad (mayor que cero) y Código o Descripción.',
    '4️⃣ Unidad y Costo unitario son opcionales. Sin costo se usa el costo promedio del producto',
    '   para el presupuesto de materiales.',
    '5️⃣ Números sin símbolos ($, puntos de miles); decimales con coma o punto.',
    '6️⃣ En el proyecto: Materiales → Cargar desde Excel → Subir archivo .xlsx (o copia y pega las filas).',
    '',
    'Ejemplo:',
    'Código | Descripción | Cantidad | Unidad | Costo unitario',
    'PAN-550 | Panel solar monocristalino 550 W | 24 | UND | 650000',
    ' | Cable solar 6 mm rojo | 120 | MT | 3200',
  ].forEach((line) => wsInstructions.addRow([line]));
  wsInstructions.getColumn(1).width = 100;

  await downloadWorkbook(wb, `plantilla_materiales${projectCode ? `_${projectCode}` : ''}.xlsx`);
};

// Número de una celda del Excel: acepta 12000, "12000", "12.000,5" o "12,000.5".
const excelNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v.result !== undefined) return excelNumber(v.result);
  let s = String(v).trim().replace(/[$%\s]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const excelText = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('').trim();
    if (v.text !== undefined) return String(v.text).trim();
    if (v.result !== undefined) return String(v.result).trim();
  }
  return String(v).trim();
};

/**
 * Lee el Excel de líneas de compra. Devuelve { rows, errors }:
 * rows: [{ row, code, quantity, unit_cost, tax_rate|null, discount_percentage, profit_margin_pct|null }]
 * errors: [{ row, message }] (filas con datos inválidos; no se incluyen en rows).
 */
export const parsePurchaseLinesFile = async (file) => {
  const data = await parseImportedFile(file);
  const C = PURCHASE_LINES_COLUMNS;
  const rows = [];
  const errors = [];
  data.forEach((obj, i) => {
    const row = i + 2; // fila 1 = encabezados
    const code = excelText(obj[C.code]);
    const quantity = excelNumber(obj[C.quantity]);
    const unitCost = excelNumber(obj[C.unitCost]);
    const tax = excelNumber(obj[C.tax]);
    const discount = excelNumber(obj[C.discount]);
    const margin = excelNumber(obj[C.margin]);
    if (!code && quantity === null && unitCost === null) return; // fila vacía
    const problems = [];
    if (!code) problems.push('falta el Código');
    if (!(quantity > 0)) problems.push('la Cantidad debe ser mayor a 0');
    if (!(unitCost >= 0) || unitCost === null) problems.push('falta el Costo Unitario');
    if (Number.isNaN(tax) || (tax !== null && (tax < 0 || tax > 100))) problems.push('IVA inválido');
    if (Number.isNaN(discount) || (discount !== null && (discount < 0 || discount > 100))) problems.push('Descuento inválido');
    if (Number.isNaN(margin) || (margin !== null && margin < 0)) problems.push('Margen inválido');
    if (problems.length) { errors.push({ row, code, message: problems.join(', ') }); return; }
    rows.push({ row, code, quantity, unit_cost: unitCost, tax_rate: tax, discount_percentage: discount || 0, profit_margin_pct: margin });
  });
  return { rows, errors };
};
