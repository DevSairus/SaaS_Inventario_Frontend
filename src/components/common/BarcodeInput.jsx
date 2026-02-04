import { useState, useRef, useEffect } from 'react';
import BarcodeScanner from './BarcodeScanner';

/**
 * Componente de input para códigos de barras que soporta:
 * 1. Entrada manual
 * 2. Escaneo con cámara
 * 3. Pistola lectora USB (automático)
 */
const BarcodeInput = ({ value, onChange, onScan, placeholder = "Código de barras", className = "" }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [buffer, setBuffer] = useState('');
  const inputRef = useRef(null);
  const bufferTimerRef = useRef(null);

  // Detectar entrada rápida de pistola lectora USB
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Solo procesar si el input está enfocado o si viene de la pistola
      const isTargetInput = e.target === inputRef.current;
      const isFastTyping = buffer.length > 0; // Ya hay caracteres en el buffer

      // Las pistolas de código de barras suelen terminar con Enter
      if (e.key === 'Enter' && buffer.length > 0) {
        e.preventDefault();
        
        // Procesar el código escaneado
        const scannedCode = buffer.trim();
        if (scannedCode.length > 0) {
          if (onChange) {
            onChange({ target: { name: 'barcode', value: scannedCode } });
          }
          if (onScan) {
            onScan(scannedCode);
          }
          
          // Dar feedback visual
          if (inputRef.current) {
            inputRef.current.classList.add('ring-2', 'ring-green-500');
            setTimeout(() => {
              inputRef.current?.classList.remove('ring-2', 'ring-green-500');
            }, 500);
          }
        }
        
        // Limpiar buffer
        setBuffer('');
        if (bufferTimerRef.current) {
          clearTimeout(bufferTimerRef.current);
        }
        return;
      }

      // Acumular caracteres si es escritura rápida (< 50ms entre caracteres)
      if (e.key.length === 1) { // Solo caracteres individuales
        setBuffer(prev => prev + e.key);
        
        // Limpiar buffer después de 100ms de inactividad
        if (bufferTimerRef.current) {
          clearTimeout(bufferTimerRef.current);
        }
        bufferTimerRef.current = setTimeout(() => {
          setBuffer('');
        }, 100);
      }
    };

    // Escuchar eventos globales de teclado
    window.addEventListener('keypress', handleKeyPress);
    
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, [buffer, onChange, onScan]);

  const handleCameraScan = (code) => {
    if (onChange) {
      onChange({ target: { name: 'barcode', value: code } });
    }
    if (onScan) {
      onScan(code);
    }
    setShowScanner(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          name="barcode"
          value={value}
          onChange={onChange}
          className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
          placeholder={placeholder}
          autoComplete="off"
        />
        
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
          title="Escanear con cámara"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {showScanner && (
        <BarcodeScanner
          onDetect={handleCameraScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
};

export default BarcodeInput;