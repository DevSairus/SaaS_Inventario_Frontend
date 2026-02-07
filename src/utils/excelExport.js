/**
 * Exportar e Importar datos en formato Excel (.xlsx)
 * Versión SIMPLIFICADA con nuevo formato
 */

import * as XLSX from 'xlsx';

/**
 * Descargar plantilla SIMPLIFICADA de Excel para importar productos
 * Nueva estructura: Código, Nombre, Costo Promedio, Precio Venta, Margen Utilidad (%), Cantidad
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
// FUNCIONES DE EXPORTACIÓN (sin cambios)
// ========================================

/**
 * Exportar productos a Excel (.xlsx)
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

  // Resumen
  const summary = [
    { 'Métrica': 'Total de Productos', 'Valor': products.length },
    { 'Métrica': 'Productos Activos', 'Valor': products.filter(p => p.is_active).length },
    { 'Métrica': 'Valor Total Inventario', 'Valor': products.reduce((sum, p) => sum + (parseFloat(p.current_stock) * parseFloat(p.average_cost || 0)), 0).toFixed(2) },
    { 'Métrica': 'Fecha de Exportación', 'Valor': new Date().toLocaleString('es-CO') }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summary);
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
 * Exportar movimientos a Excel
 */
export const exportMovementsToExcel = (movements, filename = 'movimientos') => {
  const data = movements.map(mov => ({
    'Fecha': new Date(mov.created_at).toLocaleString('es-CO'),
    'Tipo': mov.movement_type,
    'Producto': mov.product?.name || '',
    'SKU': mov.product?.sku || '',
    'Cantidad': mov.quantity,
    'Costo Unitario': mov.unit_cost || 0,
    'Usuario': (mov.user?.first_name || '') + ' ' + (mov.user?.last_name || ''),
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
    { wch: 15 },  // Costo Unitario
    { wch: 25 },  // Usuario
    { wch: 40 }   // Notas
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
};

/**
 * Exportar compras a Excel
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