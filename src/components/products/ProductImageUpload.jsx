// ProductImageUpload.jsx — Widget de carga/eliminación de imagen de producto
import { useState, useRef } from 'react';
import { productsAPI } from '../../api/products';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? '';

export default function ProductImageUpload({ productId, imageUrl, onImageChange }) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [preview, setPreview]     = useState(null); // preview local antes de subir
  const inputRef = useRef(null);

  const fullUrl = imageUrl
    ? (imageUrl.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`)
    : null;

  const displaySrc = preview || fullUrl;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local inmediato
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    if (!productId) {
      // Producto aún no guardado — solo guardamos el file para que el padre lo suba después
      onImageChange?.({ file, preview: URL.createObjectURL(file) });
      return;
    }

    setUploading(true);
    try {
      const res = await productsAPI.uploadImage(productId, file);
      onImageChange?.(res.data.image_url);
      setPreview(null);
      toast.success('Imagen actualizada');
    } catch {
      toast.error('Error al subir la imagen');
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!productId || !imageUrl) return;
    setDeleting(true);
    try {
      await productsAPI.deleteImage(productId);
      onImageChange?.(null);
      toast.success('Imagen eliminada');
    } catch {
      toast.error('Error al eliminar la imagen');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Imagen del producto</label>

      {/* Preview / Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-colors cursor-pointer ${
          displaySrc
            ? 'border-transparent'
            : 'border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50'
        }`}
        style={{ height: displaySrc ? 'auto' : 120 }}
      >
        {displaySrc ? (
          <div className="relative group">
            <img
              src={displaySrc}
              alt="Imagen del producto"
              className="w-full max-h-48 object-contain bg-gray-50 rounded-xl"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="px-3 py-1.5 bg-white text-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Cambiar
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition disabled:opacity-60"
                >
                  {deleting ? 'Eliminando…' : 'Eliminar'}
                </button>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                <div className="flex items-center gap-2 text-white text-sm font-medium">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Subiendo…
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
            {uploading ? (
              <svg className="animate-spin w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-gray-400">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <p className="text-xs text-gray-500 text-center">
                  Clic para agregar imagen<br />
                  <span className="text-gray-400">JPG, PNG, WEBP · máx 3 MB</span>
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}