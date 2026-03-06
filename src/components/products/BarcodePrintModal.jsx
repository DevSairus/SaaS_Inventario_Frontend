// frontend/src/components/products/BarcodePrintModal.jsx
// Dependencia requerida: npm install jsbarcode
import { useState, useCallback, useEffect } from 'react';
import { X, Printer, Package, Info, Wand2, CheckCircle, AlertCircle } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { productsAPI } from '../../api/products';

const LABEL_SIZES = [
  { id: '58x30', label: '58 × 30 mm', w: 58, h: 30, barcodeH: 28, fontSize: 6.5 },
  { id: '58x40', label: '58 × 40 mm', w: 58, h: 40, barcodeH: 36, fontSize: 7 },
  { id: '80x50', label: '80 × 50 mm', w: 80, h: 50, barcodeH: 42, fontSize: 8 },
  { id: '100x60', label: '100 × 60 mm', w: 100, h: 60, barcodeH: 50, fontSize: 9 },
];

const generateEAN13 = () => {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return [...digits, check].join('');
};

const generateBarcodeDataURL = (value, barcodeH) => {
  if (!value) return null;
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, String(value), {
      format: 'CODE128',
      width: 1.5,
      height: barcodeH,
      displayValue: true,
      fontSize: 10,
      margin: 3,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Error generando código de barras:', e);
    return null;
  }
};

function LabelPreview({ barcode, product, size, showName, showSku }) {
  const dataURL = barcode ? generateBarcodeDataURL(barcode, size.barcodeH) : null;

  return (
    <div
      style={{
        width: `${size.w * 2.4}px`,
        height: `${size.h * 2.4}px`,
        border: '1px dashed #9ca3af',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 6px',
        background: '#fff',
        boxSizing: 'border-box',
        gap: 2,
      }}
    >
      {showName && (
        <div style={{
          fontSize: `${size.fontSize}pt`,
          fontWeight: 700,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          color: '#111',
        }}>
          {product.name}
        </div>
      )}
      {dataURL ? (
        <img src={dataURL} alt="barcode" style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
      ) : (
        <div style={{
          fontSize: '7pt',
          color: '#ef4444',
          textAlign: 'center',
          padding: '4px 6px',
          background: '#fef2f2',
          borderRadius: 4,
          border: '1px dashed #fca5a5',
        }}>
          Sin código de barras
        </div>
      )}
      {showSku && (
        <div style={{ fontSize: `${size.fontSize - 1}pt`, color: '#555', textAlign: 'center' }}>
          {product.sku}
        </div>
      )}
    </div>
  );
}

export default function BarcodePrintModal({ isOpen, onClose, product, onBarcodeGenerated }) {
  const [quantity, setQuantity]         = useState(1);
  const [selectedSize, setSelectedSize] = useState(LABEL_SIZES[1]);
  const [showName, setShowName]         = useState(true);
  const [showSku, setShowSku]           = useState(true);

  const [generating, setGenerating]           = useState(false);
  const [generateStatus, setGenerateStatus]   = useState(null);
  const [generateMessage, setGenerateMessage] = useState('');

  // Barcode propio del modal: se inicializa con el del producto y
  // se actualiza localmente cuando se genera uno nuevo, sin depender
  // de que el prop `product` se re-renderice desde el padre.
  const [currentBarcode, setCurrentBarcode] = useState(null);

  // Sincronizar cuando cambia el producto (al abrir el modal con otro producto)
  useEffect(() => {
    setCurrentBarcode(product?.barcode || null);
    setGenerateStatus(null);
    setGenerateMessage('');
  }, [product?.id]);

  const hasBarcode = Boolean(currentBarcode);

  const handleGenerateAndSave = useCallback(async () => {
    if (!product) return;
    setGenerating(true);
    setGenerateStatus(null);
    setGenerateMessage('');
    try {
      const newBarcode = generateEAN13();
      const result = await productsAPI.update(product.id, { barcode: newBarcode });
      if (result?.success) {
        // Actualizar estado interno del modal de inmediato
        setCurrentBarcode(newBarcode);
        setGenerateStatus('success');
        setGenerateMessage(`Código ${newBarcode} guardado correctamente.`);
        // Notificar al padre para actualizar el store/lista
        if (onBarcodeGenerated) onBarcodeGenerated(product.id, newBarcode);
      } else {
        throw new Error(result?.message || 'Error al guardar');
      }
    } catch (err) {
      setGenerateStatus('error');
      setGenerateMessage(err?.response?.data?.message || err.message || 'No se pudo guardar el código.');
    } finally {
      setGenerating(false);
    }
  }, [product, onBarcodeGenerated]);

  const handlePrint = useCallback(() => {
    if (!product || !hasBarcode) return;
    const dataURL = generateBarcodeDataURL(currentBarcode, selectedSize.barcodeH);
    if (!dataURL) return;

    const labelHTML = `
      <div class="label">
        ${showName ? `<div class="label-name">${product.name}</div>` : ''}
        <img src="${dataURL}" class="barcode-img" alt="barcode" />
        ${showSku ? `<div class="label-sku">${product.sku}</div>` : ''}
      </div>
    `;

    const labelsHTML = Array.from({ length: quantity }).map(() => labelHTML).join('');

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Etiquetas – ${product.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              background: #f3f4f6;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              padding: 12px;
            }
            .no-print { margin-bottom: 12px; }
            .grid {
              display: flex;
              flex-wrap: wrap;
              gap: 2mm;
              background: white;
              padding: 4mm;
              border-radius: 4px;
            }
            .label {
              width: ${selectedSize.w}mm;
              height: ${selectedSize.h}mm;
              border: 0.4pt solid #ccc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 1mm 1.5mm;
              page-break-inside: avoid;
              background: white;
              gap: 0.5mm;
            }
            .label-name {
              font-size: ${selectedSize.fontSize}pt;
              font-weight: bold;
              text-align: center;
              width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              color: #111;
            }
            .barcode-img { max-width: 100%; height: auto; display: block; }
            .label-sku   { font-size: ${selectedSize.fontSize - 1}pt; color: #444; text-align: center; }
            @page { size: auto; margin: 3mm; }
            @media print {
              body { background: white; padding: 0; }
              .no-print { display: none !important; }
              .grid { box-shadow: none; padding: 0; background: transparent; }
            }
          </style>
        </head>
        <body>
          <div>
            <div class="no-print" style="text-align:center">
              <button onclick="window.print()" style="padding:8px 24px;background:#2563eb;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600;">
                🖨️ Imprimir ${quantity} etiqueta${quantity > 1 ? 's' : ''}
              </button>
              <button onclick="window.close()" style="margin-left:8px;padding:8px 16px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:6px;font-size:14px;cursor:pointer;">
                Cerrar
              </button>
            </div>
            <div class="grid">${labelsHTML}</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  }, [product, quantity, selectedSize, showName, showSku, currentBarcode, hasBarcode]);

  const handleClose = () => {
    setGenerateStatus(null);
    setGenerateMessage('');
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header fijo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Imprimir etiquetas</h2>
              <p className="text-xs text-gray-500 truncate max-w-[240px]">{product.name}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="overflow-y-auto flex-1 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Columna izquierda — Opciones */}
            <div className="space-y-4">

              {/* Tamaño */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Tamaño de etiqueta
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {LABEL_SIZES.map(size => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition ${
                        selectedSize.id === size.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Cantidad de etiquetas
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg"
                  >−</button>
                  <input
                    type="number"
                    min="1" max="200"
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center border border-gray-200 rounded-lg py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    onClick={() => setQuantity(q => Math.min(200, q + 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg"
                  >+</button>
                </div>
              </div>

              {/* Contenido */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Contenido de la etiqueta
                </label>
                <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                  {[
                    { value: showName, set: setShowName, label: 'Nombre del producto' },
                    { value: showSku,  set: setShowSku,  label: 'SKU / Referencia'    },
                  ].map(({ value, set, label }) => (
                    <label key={label} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={e => set(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Generar código si no tiene */}
              {!hasBarcode && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
                  <div className="flex gap-2 items-start">
                    <AlertCircle size={14} className="text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700 leading-relaxed">
                      Este producto <strong>no tiene código de barras</strong>. Genera uno automáticamente (EAN-13) y se guardará en el producto.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateAndSave}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <Wand2 size={13} />
                    {generating ? 'Generando...' : 'Generar y guardar código de barras'}
                  </button>
                  {generateStatus === 'error' && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={11} /> {generateMessage}
                    </p>
                  )}
                </div>
              )}

              {generateStatus === 'success' && (
                <div className="flex gap-2 items-center bg-green-50 border border-green-200 rounded-xl p-3">
                  <CheckCircle size={14} className="text-green-600 shrink-0" />
                  <p className="text-xs text-green-700">{generateMessage}</p>
                </div>
              )}

              {/* Tip */}
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Configura el tamaño de papel en tu impresora <strong>antes de imprimir</strong> para que coincida con las etiquetas.
                </p>
              </div>
            </div>

            {/* Columna derecha — Vista previa */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Vista previa
              </label>
              <div className="bg-gray-100 rounded-xl p-5 flex flex-col items-center justify-center gap-3 min-h-[200px]">
                <LabelPreview
                  barcode={currentBarcode}
                  product={product}
                  size={selectedSize}
                  showName={showName}
                  showSku={showSku}
                />
                <p className="text-xs text-gray-400">
                  {hasBarcode ? `Código: ${currentBarcode}` : 'Sin código de barras asignado'}
                </p>
              </div>

              {/* Info del producto */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">SKU:</span>
                  <span className="font-medium text-gray-800">{product.sku}</span>
                </div>
                {currentBarcode && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Cód. barras:</span>
                    <span className="font-medium text-gray-800">{currentBarcode}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer fijo */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition bg-white"
          >
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            disabled={!hasBarcode}
            title={!hasBarcode ? 'Genera un código de barras primero' : ''}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={16} />
            Imprimir {quantity} etiqueta{quantity !== 1 ? 's' : ''}
          </button>
        </div>

      </div>
    </div>
  );
}