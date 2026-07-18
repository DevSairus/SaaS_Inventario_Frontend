import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import BarcodeScanner from '../../components/common/BarcodeScanner';

// Punto de entrada dedicado de escaneo de placa/VIN, parte del alcance de la
// PWA "Taller" (bottom-nav de 3 ítems: OT, Vehículos, Escanear).
export default function ScannerPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);

  const handleDetect = (code) => {
    setScanning(false);
    navigate(`/workshop/vehicles?search=${encodeURIComponent(code.trim())}`);
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto text-center py-10">
        <ScanLine className="w-12 h-12 mx-auto text-primary-600 mb-3" />
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Escanear placa / VIN</h1>
        <p className="text-sm text-gray-500 mb-6">
          Apunta la cámara al código de barras o VIN del vehículo para buscarlo.
        </p>
        {!scanning && (
          <button
            onClick={() => setScanning(true)}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"
          >
            Escanear de nuevo
          </button>
        )}
      </div>
      {scanning && (
        <BarcodeScanner
          onDetect={handleDetect}
          onClose={() => setScanning(false)}
          hint="Apunta al código de barras o VIN del vehículo"
        />
      )}
    </Layout>
  );
}
