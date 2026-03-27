// src/components/workshop/RuntConsultaModal.jsx
//
// Modal que:
//  1. Carga el CAPTCHA del RUNT via backend proxy
//  2. El usuario ingresa cédula + texto del captcha
//  3. Envía al backend → recibe datos del vehículo
//  4. Llama onConfirm(vehiculo) para pre-llenar el formulario
//
// La cédula y la imagen del CAPTCHA NUNCA se almacenan.

import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, Search, Loader, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from '../../api/axios';

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

export default function RuntConsultaModal({ placa: placaProp = '', onConfirm, onClose }) {
  const [placa,        setPlaca]        = useState(placaProp.toUpperCase());
  const [documento,    setDocumento]    = useState('');
  const [tipoDoc,      setTipoDoc]      = useState('C');
  const [captchaText,  setCaptchaText]  = useState('');
  const [captchaId,    setCaptchaId]    = useState(null);
  const [captchaImg,   setCaptchaImg]   = useState(null);
  const [loadingCap,   setLoadingCap]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  /* ── Cargar / recargar captcha ─────────────────────────────── */
  const fetchCaptcha = useCallback(async () => {
    setLoadingCap(true);
    setCaptchaImg(null);
    setCaptchaText('');
    setError('');
    try {
      const res = await axios.get('/workshop/vehicles/runt/captcha');
      setCaptchaId(res.data.id);
      setCaptchaImg(res.data.imagen);  // ya viene como data:image/png;base64,...
    } catch {
      setError('No se pudo cargar el CAPTCHA. Verifica tu conexión.');
    } finally {
      setLoadingCap(false);
    }
  }, []);

  // Cargar captcha al montar
  useEffect(() => { fetchCaptcha(); }, [fetchCaptcha]);

  /* ── Consultar ─────────────────────────────────────────────── */
  const handleConsultar = async () => {
    if (!placa.trim())        return setError('Ingresa la placa del vehículo');
    if (!documento.trim())    return setError('Ingresa el número de documento del propietario');
    if (!captchaText.trim())  return setError('Ingresa el texto del CAPTCHA');
    if (!captchaId)           return setError('El CAPTCHA no está listo. Recárgalo.');

    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/workshop/vehicles/runt/consultar', {
        placa:          placa.toUpperCase().trim(),
        documento:      documento.trim(),
        tipoDocumento:  tipoDoc,
        captcha:        captchaText.trim(),
        idLibreCaptcha: captchaId,
      });

      onConfirm(res.data.data);   // pre-llena el formulario

    } catch (err) {
      const msg = err.response?.data?.message || 'Error consultando el RUNT. Se ha cargado un nuevo CAPTCHA.';
      setError(msg);
      // Siempre refrescar el captcha — es de un solo uso, ya quedó consumido
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  /* ── UI ─────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <div>
            <p className="font-semibold text-sm">🔎 Consultar RUNT</p>
            {placa && <p className="text-xs text-gray-400 mt-0.5">Placa: <span className="font-mono font-bold text-white">{placa}</span></p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Aviso privacidad */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
            🔒 El documento del propietario <strong>no se almacena</strong> — solo se usa para esta consulta.
          </div>

          {/* Placa */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Placa del vehículo *</label>
            <input
              type="text"
              value={placa}
              onChange={e => setPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="Ej: ABC123"
              maxLength={7}
              className={`${inputCls} font-mono uppercase tracking-widest`}
              onKeyDown={e => e.key === 'Enter' && handleConsultar()}
            />
          </div>

          {/* Tipo documento + número */}
          <div className="flex gap-2">
            <div className="w-28">
              <label className="text-xs text-gray-500 block mb-1">Tipo doc.</label>
              <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)} className={inputCls}>
                <option value="C">Cédula</option>
                <option value="E">C. Extranjer.</option>
                <option value="P">Pasaporte</option>
                <option value="N">NIT</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Número de documento *</label>
              <input
                type="text"
                value={documento}
                onChange={e => setDocumento(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej: 92549045"
                className={inputCls}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleConsultar()}
              />
            </div>
          </div>

          {/* CAPTCHA */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500">CAPTCHA *</label>
              <button
                type="button"
                onClick={fetchCaptcha}
                disabled={loadingCap}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 transition"
              >
                <RefreshCw size={11} className={loadingCap ? 'animate-spin' : ''} />
                Nuevo captcha
              </button>
            </div>

            {/* Imagen captcha */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-40 h-14 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                {loadingCap ? (
                  <Loader size={18} className="text-gray-400 animate-spin" />
                ) : captchaImg ? (
                  <img
                    src={captchaImg}
                    alt="CAPTCHA"
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <span className="text-xs text-gray-400">Sin imagen</span>
                )}
              </div>
              <input
                type="text"
                value={captchaText}
                onChange={e => setCaptchaText(e.target.value)}
                placeholder="Ej: HvV4P"
                maxLength={8}
                className={`${inputCls} font-mono tracking-widest text-center text-base`}
                onKeyDown={e => e.key === 'Enter' && handleConsultar()}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Escribe los caracteres que ves en la imagen</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-xl hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConsultar}
            disabled={loading || loadingCap || !captchaImg}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading
              ? <><Loader size={14} className="animate-spin" /> Consultando...</>
              : <><Search size={14} /> Consultar RUNT</>
            }
          </button>
        </div>

      </div>
    </div>
  );
}