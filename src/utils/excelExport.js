/**
 * Exportar e Importar datos en formato Excel (.xlsx)
 * Utiliza xlsx (SheetJS) - La biblioteca más popular para Excel en JavaScript
 * 
 * IMPORTANTE: Requiere instalar la dependencia:
 * npm install xlsx
 */

import * as XLSX from 'xlsx';

/**
 * Exportar productos a Excel (.xlsx)
 * @param {Array} products - Array de productos
 * @param {string} filename - Nombre del archivo (sin extensión)
 */
export const exportProductsToExcel = (products, filename = 'productos') => {
  // Preparar datos para Excel
  const data = products.map(product => ({
    'SKU': product.sku || '',
    'Código de Barras': product.barcode || '',
    'Nombre': product.name || '',
    'Descripción': product.description || '',
    'Categoría': product.category?.name || 'Sin categoría',
    'Stock Actual': parseFloat(product.current_stock) || 0,
    'Stock Mínimo': parseFloat(product.min_stock) || 0,
    'Stock Máximo': parseFloat(product.max_stock) || 0,
    'Unidad': product.unit || '',
    'Precio de Venta': parseFloat(product.sale_price) || 0,
    'Costo Promedio': parseFloat(product.average_cost) || 0,
    'Ubicación': product.location || '',
    'Controla Inventario': product.track_inventory ? 'Sí' : 'No',
    'Estado': product.is_active ? 'Activo' : 'Inactivo'
  }));

  // Crear workbook y worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Configurar anchos de columnas
  const colWidths = [
    { wch: 15 },  // SKU
    { wch: 18 },  // Código de Barras
    { wch: 30 },  // Nombre
    { wch: 40 },  // Descripción
    { wch: 20 },  // Categoría
    { wch: 12 },  // Stock Actual
    { wch: 12 },  // Stock Mínimo
    { wch: 12 },  // Stock Máximo
    { wch: 10 },  // Unidad
    { wch: 15 },  // Precio de Venta
    { wch: 15 },  // Costo Promedio
    { wch: 20 },  // Ubicación
    { wch: 18 },  // Controla Inventario
    { wch: 10 }   // Estado
  ];
  ws['!cols'] = colWidths;

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');

  // Agregar hoja de resumen
  const summary = [
    { 'Métrica': 'Total de Productos', 'Valor': products.length },
    { 'Métrica': 'Productos Activos', 'Valor': products.filter(p => p.is_active).length },
    { 'Métrica': 'Productos Inactivos', 'Valor': products.filter(p => !p.is_active).length },
    { 'Métrica': 'Valor Total del Inventario', 'Valor': products.reduce((sum, p) => sum + (parseFloat(p.current_stock) * parseFloat(p.average_cost || 0)), 0).toFixed(2) },
    { 'Métrica': 'Fecha de Exportación', 'Valor': new Date().toLocaleString('es-CO') }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // Descargar archivo
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
};

/**
 * Exportar categorías a Excel (.xlsx)
 * @param {Array} categories - Array de categorías
 * @param {string} filename - Nombre del archivo
 */
export const exportCategoriesToExcel = (categories, filename = 'categorias') => {
  const data = categories.map(category => ({
    'ID': category.id,
    'Nombre': category.name || '',
    'Descripción': category.description || '',
    'Categoría Padre': category.parent?.name || 'Sin padre',
    'Nivel': category.parent ? 'Subcategoría' : 'Categoría Principal',
    'Estado': category.is_active ? 'Activa' : 'Inactiva',
    'Fecha de Creación': new Date(category.created_at).toLocaleDateString('es-CO'),
    'Última Actualización': new Date(category.updated_at).toLocaleDateString('es-CO')
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Anchos de columnas
  ws['!cols'] = [
    { wch: 8 },   // ID
    { wch: 25 },  // Nombre
    { wch: 40 },  // Descripción
    { wch: 25 },  // Categoría Padre
    { wch: 20 },  // Nivel
    { wch: 12 },  // Estado
    { wch: 18 },  // Fecha Creación
    { wch: 18 }   // Última Actualización
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Categorías');

  // Hoja de resumen
  const summary = [
    { 'Métrica': 'Total de Categorías', 'Valor': categories.length },
    { 'Métrica': 'Categorías Activas', 'Valor': categories.filter(c => c.is_active).length },
    { 'Métrica': 'Categorías Inactivas', 'Valor': categories.filter(c => !c.is_active).length },
    { 'Métrica': 'Categorías Principales', 'Valor': categories.filter(c => !c.parent_id).length },
    { 'Métrica': 'Subcategorías', 'Valor': categories.filter(c => c.parent_id).length },
    { 'Métrica': 'Fecha de Exportación', 'Valor': new Date().toLocaleString('es-CO') }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
};

/**
 * Descargar plantilla de Excel para importar productos
 */
export const downloadProductsTemplate = () => {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Plantilla con ejemplo
  const templateData = [
    {
      'SKU*': 'PROD001',
      'Código de Barras': '7501234567890',
      'Nombre*': 'Producto de Ejemplo',
      'Descripción': 'Descripción detallada del producto',
      'Categoría': 'Electrónica',
      'Stock Actual*': 100,
      'Stock Mínimo*': 10,
      'Stock Máximo': 500,
      'Unidad*': 'unidad',
      'Precio de Venta*': 15000,
      'Costo Promedio': 10000,
      'Ubicación': 'Bodega A - Estante 1',
      'Controla Inventario*': 'SI'
    }
  ];

  // Agregar 15 filas vacías para que el usuario complete
  for (let i = 0; i < 15; i++) {
    templateData.push({
      'SKU*': '',
      'Código de Barras': '',
      'Nombre*': '',
      'Descripción': '',
      'Categoría': '',
      'Stock Actual*': '',
      'Stock Mínimo*': '',
      'Stock Máximo': '',
      'Unidad*': '',
      'Precio de Venta*': '',
      'Costo Promedio': '',
      'Ubicación': '',
      'Controla Inventario*': ''
    });
  }

  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // Anchos de columnas
  ws['!cols'] = [
    { wch: 15 },  // SKU
    { wch: 18 },  // Código de Barras
    { wch: 30 },  // Nombre
    { wch: 40 },  // Descripción
    { wch: 20 },  // Categoría
    { wch: 12 },  // Stock Actual
    { wch: 12 },  // Stock Mínimo
    { wch: 12 },  // Stock Máximo
    { wch: 20 },  // Unidad
    { wch: 15 },  // Precio de Venta
    { wch: 15 },  // Costo Promedio
    { wch: 25 },  // Ubicación
    { wch: 20 }   // Controla Inventario
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Productos');

  // Hoja 2: Instrucciones (separada)
  const instructions = [
    { '': '' },
    { '': '📋 INSTRUCCIONES PARA IMPORTAR PRODUCTOS' },
    { '': '' },
    { '': '1️⃣ CAMPOS OBLIGATORIOS (marcados con *)' },
    { '': '   • SKU*: Código único del producto' },
    { '': '   • Nombre*: Nombre del producto' },
    { '': '   • Stock Actual*: Cantidad en inventario (número)' },
    { '': '   • Stock Mínimo*: Cantidad mínima (número)' },
    { '': '   • Unidad*: Unidad de medida (unidad, pieza, kg, litro, etc)' },
    { '': '   • Precio de Venta*: Precio al público (número)' },
    { '': '   • Controla Inventario*: SI o NO' },
    { '': '' },
    { '': '2️⃣ CAMPOS OPCIONALES' },
    { '': '   • Código de Barras: Código de barras del producto' },
    { '': '   • Descripción: Descripción detallada' },
    { '': '   • Categoría: Nombre de una categoría existente' },
    { '': '   • Stock Máximo: Cantidad máxima recomendada' },
    { '': '   • Costo Promedio: Costo de compra' },
    { '': '   • Ubicación: Ubicación en bodega' },
    { '': '' },
    { '': '3️⃣ IMPORTANTE' },
    { '': '   • La primera fila contiene un EJEMPLO' },
    { '': '   • Puedes eliminar el ejemplo o dejarlo' },
    { '': '   • Completa tus productos en las filas siguientes' },
    { '': '   • Los números NO deben llevar símbolos ($, %, etc)' },
    { '': '   • Controla Inventario solo acepta: SI o NO' },
    { '': '' },
    { '': '4️⃣ PASOS' },
    { '': '   1. Ve a la hoja "Productos"' },
    { '': '   2. Completa los datos de tus productos' },
    { '': '   3. Guarda el archivo (mantén formato .xlsx)' },
    { '': '   4. Importa el archivo en el sistema' },
    { '': '' },
    { '': '✅ ¡Listo para importar!' }
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructions, { skipHeader: true });
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  // Hoja 3: Ayuda de Campos
  const help = [
    { 'Campo': 'SKU*', 'Descripción': 'Código único del producto (obligatorio)', 'Ejemplo': 'PROD001, SKU-123, ART-456' },
    { 'Campo': 'Código de Barras', 'Descripción': 'Código de barras del producto (opcional)', 'Ejemplo': '7501234567890' },
    { 'Campo': 'Nombre*', 'Descripción': 'Nombre del producto (obligatorio)', 'Ejemplo': 'Laptop Dell Inspiron 15' },
    { 'Campo': 'Descripción', 'Descripción': 'Descripción detallada del producto (opcional)', 'Ejemplo': 'Laptop con procesador Intel i5...' },
    { 'Campo': 'Categoría', 'Descripción': 'Nombre exacto de una categoría existente (opcional)', 'Ejemplo': 'Electrónica, Papelería, Alimentos' },
    { 'Campo': 'Stock Actual*', 'Descripción': 'Cantidad actual en inventario (obligatorio, número)', 'Ejemplo': '100, 50, 25.5' },
    { 'Campo': 'Stock Mínimo*', 'Descripción': 'Cantidad mínima antes de alerta (obligatorio, número)', 'Ejemplo': '10, 5, 2' },
    { 'Campo': 'Stock Máximo', 'Descripción': 'Cantidad máxima recomendada (opcional, número)', 'Ejemplo': '500, 1000' },
    { 'Campo': 'Unidad*', 'Descripción': 'Unidad de medida (obligatorio)', 'Ejemplo': 'unidad, pieza, kg, gramo, litro, ml, caja, paquete, docena, metro, cm' },
    { 'Campo': 'Precio de Venta*', 'Descripción': 'Precio de venta al público (obligatorio, número sin $)', 'Ejemplo': '15000, 25000.50' },
    { 'Campo': 'Costo Promedio', 'Descripción': 'Costo promedio de compra (opcional, número sin $)', 'Ejemplo': '10000, 18000' },
    { 'Campo': 'Ubicación', 'Descripción': 'Ubicación física en bodega (opcional)', 'Ejemplo': 'Bodega A - Estante 3' },
    { 'Campo': 'Controla Inventario*', 'Descripción': 'SI para controlar stock, NO para no controlarlo (obligatorio)', 'Ejemplo': 'SI, NO' }
  ];
  
  const wsHelp = XLSX.utils.json_to_sheet(help);
  wsHelp['!cols'] = [{ wch: 25 }, { wch: 55 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsHelp, 'Ayuda de Campos');

  XLSX.writeFile(wb, 'plantilla_productos.xlsx');
};

/**
 * Parsear archivo Excel importado
 * @param {File} file - Archivo Excel
 * @returns {Promise<Array>} Array de productos
 */
export const parseImportedFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Leer la primera hoja (Productos)
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
          raw: false,
          defval: ''
        });

        // Filtrar filas vacías y de ejemplo
        const validData = jsonData.filter(row => {
          const sku = row['SKU*']?.toString().trim();
          const nombre = row['Nombre*']?.toString().trim();
          
          // Excluir filas completamente vacías
          if (!sku && !nombre) {
            return false;
          }
          
          // Excluir la fila de ejemplo (SKU = PROD001 y Nombre = Producto de Ejemplo)
          if (sku === 'PROD001' && nombre === 'Producto de Ejemplo') {
            return false;
          }
          
          // Incluir cualquier otra fila que tenga SKU o Nombre
          return true;
        });

        if (validData.length === 0) {
          reject(new Error('El archivo no contiene datos válidos para importar'));
          return;
        }

        resolve(validData);
      } catch (error) {
        reject(new Error('Error al procesar el archivo Excel: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Validar datos importados de productos
 * @param {Array} data - Array de productos
 * @returns {Object} Resultado de validación
 */
export const validateImportedProducts = (data) => {
  const errors = [];
  const validProducts = [];

  data.forEach((row, index) => {
    const rowNumber = index + 1;
    const product = {};
    const rowErrors = [];

    // Validar campos requeridos
    if (!row['SKU*'] || row['SKU*'].toString().trim() === '') {
      rowErrors.push('SKU es requerido');
    } else {
      product.sku = row['SKU*'].toString().trim();
    }

    if (!row['Nombre*'] || row['Nombre*'].toString().trim() === '') {
      rowErrors.push('Nombre es requerido');
    } else {
      product.name = row['Nombre*'].toString().trim();
    }

    // Stock actual
    const stockActual = parseFloat(row['Stock Actual*']);
    if (isNaN(stockActual) || stockActual < 0) {
      rowErrors.push('Stock Actual debe ser un número válido >= 0');
    } else {
      product.current_stock = stockActual;
    }

    // Stock mínimo
    const stockMinimo = parseFloat(row['Stock Mínimo*']);
    if (isNaN(stockMinimo) || stockMinimo < 0) {
      rowErrors.push('Stock Mínimo debe ser un número válido >= 0');
    } else {
      product.min_stock = stockMinimo;
    }

    if (!row['Unidad*'] || row['Unidad*'].toString().trim() === '') {
      rowErrors.push('Unidad es requerida');
    } else {
      product.unit = row['Unidad*'].toString().trim();
    }

    // Precio de venta
    const precioVenta = parseFloat(row['Precio de Venta*']);
    if (isNaN(precioVenta) || precioVenta < 0) {
      rowErrors.push('Precio de Venta debe ser un número válido >= 0');
    } else {
      product.sale_price = precioVenta;
    }

    // Controla inventario
    const controlaInventario = row['Controla Inventario*']?.toString().toUpperCase().trim();
    if (!['SI', 'NO', 'SÍ', 'YES', 'S', 'N'].includes(controlaInventario)) {
      rowErrors.push('Controla Inventario debe ser SI o NO');
    } else {
      product.track_inventory = ['SI', 'SÍ', 'YES', 'S'].includes(controlaInventario);
    }

    // Campos opcionales
    product.barcode = row['Código de Barras']?.toString().trim() || null;
    product.description = row['Descripción']?.toString().trim() || null;
    product.category_name = row['Categoría']?.toString().trim() || null;
    
    const stockMaximo = parseFloat(row['Stock Máximo']);
    product.max_stock = !isNaN(stockMaximo) ? stockMaximo : null;
    
    const costoPromedio = parseFloat(row['Costo Promedio']);
    product.average_cost = !isNaN(costoPromedio) ? costoPromedio : 0;
    
    product.location = row['Ubicación']?.toString().trim() || null;

    if (rowErrors.length > 0) {
      errors.push({
        row: rowNumber,
        sku: row['SKU*'] || 'Sin SKU',
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

/**
 * Exportar reporte de movimientos a Excel
 * @param {Array} movements - Array de movimientos
 * @param {string} filename - Nombre del archivo
 */
export const exportMovementsToExcel = (movements, filename = 'movimientos') => {
  const data = movements.map(mov => ({
    'Fecha': new Date(mov.created_at).toLocaleString('es-CO'),
    'Tipo': mov.movement_type,
    'Producto': mov.product?.name || '',
    'SKU': mov.product?.sku || '',
    'Cantidad': mov.quantity,
    'Unidad': mov.product?.unit || '',
    'Costo Unitario': mov.unit_cost || 0,
    'Costo Total': (mov.quantity * (mov.unit_cost || 0)).toFixed(2),
    'Usuario': mov.user?.first_name + ' ' + mov.user?.last_name,
    'Referencia': mov.reference || '',
    'Notas': mov.notes || ''
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 20 },  // Fecha
    { wch: 15 },  // Tipo
    { wch: 30 },  // Producto
    { wch: 15 },  // SKU
    { wch: 10 },  // Cantidad
    { wch: 10 },  // Unidad
    { wch: 15 },  // Costo Unitario
    { wch: 15 },  // Costo Total
    { wch: 25 },  // Usuario
    { wch: 20 },  // Referencia
    { wch: 40 }   // Notas
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

  // Resumen por tipo
  const movementTypes = {};
  movements.forEach(mov => {
    if (!movementTypes[mov.movement_type]) {
      movementTypes[mov.movement_type] = { count: 0, total: 0 };
    }
    movementTypes[mov.movement_type].count++;
    movementTypes[mov.movement_type].total += mov.quantity * (mov.unit_cost || 0);
  });

  const summary = Object.entries(movementTypes).map(([type, data]) => ({
    'Tipo de Movimiento': type,
    'Cantidad de Movimientos': data.count,
    'Valor Total': data.total.toFixed(2)
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
};

/**
 * Exportar reporte de compras a Excel
 * @param {Array} purchases - Array de compras
 * @param {string} filename - Nombre del archivo
 */
export const exportPurchasesToExcel = (purchases, filename = 'compras') => {
  // Hoja principal con compras
  const purchasesData = purchases.map(purchase => ({
    'Número': purchase.purchase_number,
    'Fecha': new Date(purchase.purchase_date).toLocaleDateString('es-CO'),
    'Proveedor': purchase.supplier?.name || '',
    'Total Items': purchase.items?.length || 0,
    'Subtotal': purchase.subtotal || 0,
    'IVA': purchase.tax_amount || 0,
    'Total': purchase.total_amount || 0,
    'Estado': purchase.status,
    'Registrado por': purchase.user?.first_name + ' ' + purchase.user?.last_name,
    'Notas': purchase.notes || ''
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(purchasesData);

  ws['!cols'] = [
    { wch: 15 },  // Número
    { wch: 12 },  // Fecha
    { wch: 25 },  // Proveedor
    { wch: 12 },  // Total Items
    { wch: 15 },  // Subtotal
    { wch: 12 },  // IVA
    { wch: 15 },  // Total
    { wch: 12 },  // Estado
    { wch: 25 },  // Usuario
    { wch: 30 }   // Notas
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Compras');

  // Hoja de detalle de items
  const itemsData = [];
  purchases.forEach(purchase => {
    purchase.items?.forEach(item => {
      itemsData.push({
        'Número Compra': purchase.purchase_number,
        'Fecha': new Date(purchase.purchase_date).toLocaleDateString('es-CO'),
        'Producto': item.product?.name || '',
        'SKU': item.product?.sku || '',
        'Cantidad': item.quantity,
        'Precio Unitario': item.unit_cost,
        'Subtotal': item.subtotal,
        'IVA': item.tax_amount,
        'Total': item.total
      });
    });
  });

  if (itemsData.length > 0) {
    const wsItems = XLSX.utils.json_to_sheet(itemsData);
    wsItems['!cols'] = [
      { wch: 15 },  // Número Compra
      { wch: 12 },  // Fecha
      { wch: 30 },  // Producto
      { wch: 15 },  // SKU
      { wch: 10 },  // Cantidad
      { wch: 15 },  // Precio Unitario
      { wch: 15 },  // Subtotal
      { wch: 12 },  // IVA
      { wch: 15 }   // Total
    ];
    XLSX.utils.book_append_sheet(wb, wsItems, 'Detalle de Items');
  }

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
};