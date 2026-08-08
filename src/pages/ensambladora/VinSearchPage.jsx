import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ScanLine, Search, Car, Loader2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import BarcodeScanner from '../../components/common/BarcodeScanner';
import { ensambladoraVehiculosApi } from '../../api/ensambladora';

// Punto de entrada del módulo Ensambladora en Pitbox (Fase 1 — Front Pitbox).
// Permite al CSA/PDV buscar un vehículo por VIN, ya sea escaneándolo o
// escribiéndolo a mano, y navega al detalle donde se consulta en línea
// contra el Core (GET /api/ensambladora/vehiculos/:vin).
//
// Fase 10 agrega una segunda vía por placa (ver
// requerimientos-pitbox-busqueda-por-placa.md) -- es aditiva, la búsqueda
// por VIN sigue igual. Como el detalle solo se enruta por VIN, buscar por
// placa resuelve el vehículo primero (GET /vehiculos/buscar?placa=) y
// navega al mismo /ensambladora/vehiculos/:vin usando el vin que trae la
// respuesta -- el resto de la pantalla de detalle no cambia.
export default function VinSearchPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [vin, setVin] = useState('');
  const [placa, setPlaca] = useState('');
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);

  const goToVin = (rawVin) => {
    const clean = rawVin.trim().toUpperCase();
    if (!clean) return;
    navigate(`/ensambladora/vehiculos/${encodeURIComponent(clean)}`);
  };

  const handleDetect = (code) => {
    setScanning(false);
    goToVin(code);
  };

  const handleSubmitVin = (e) => {
    e.preventDefault();
    goToVin(vin);
  };

  const handleSubmitPlaca = async (e) => {
    e.preventDefault();
    const clean = placa.trim().toUpperCase();
    if (!clean) return;
    setBuscandoPlaca(true);
    try {
      const res = await ensambladoraVehiculosApi.buscarPorPlaca(clean);
      const vehiculo = res.data?.data;
      if (!vehiculo?.vin) throw new Error('respuesta sin vin');
      goToVin(vehiculo.vin);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('No se encontró ningún vehículo con esa placa — puede que aún no esté registrada, intenta por VIN');
      } else {
        toast.error('No se pudo buscar el vehículo por placa');
      }
    } finally {
      setBuscandoPlaca(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-10 px-4">
        <div className="text-center mb-8">
          <Car className="w-12 h-12 mx-auto text-primary-600 mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Consultar vehículo
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Busca por placa o por VIN para ver su ficha, garantía e historial
            en la Ensambladora.
          </p>
        </div>

        <form onSubmit={handleSubmitPlaca} className="flex gap-2 mb-3">
          <input
            type="text"
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            placeholder="Placa del vehículo"
            autoCapitalize="characters"
            className="flex-1 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={!placa.trim() || buscandoPlaca}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {buscandoPlaca ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
          <span className="text-xs text-gray-400">o por VIN</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
        </div>

        <form onSubmit={handleSubmitVin} className="flex gap-2 mb-4">
          <input
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            placeholder="VIN del vehículo"
            autoCapitalize="characters"
            className="flex-1 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={!vin.trim()}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>
        </form>

        <button
          onClick={() => setScanning(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-gray-300 dark:border-white/15 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600"
        >
          <ScanLine className="w-4 h-4" />
          Escanear VIN con la cámara
        </button>
      </div>

      {scanning && (
        <BarcodeScanner
          onDetect={handleDetect}
          onClose={() => setScanning(false)}
          hint="Apunta al código del VIN (etiqueta o chasis) del vehículo"
        />
      )}
    </Layout>
  );
}
