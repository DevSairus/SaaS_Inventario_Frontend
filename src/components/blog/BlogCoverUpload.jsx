// BlogCoverUpload.jsx — Widget de carga de portada para un post de blog.
// Requiere que el post ya exista (postId) porque Cloudinary sube contra
// /superadmin/blog/:id/cover — igual que ProductImageUpload pero sin el
// caso "producto sin guardar" (un post de blog siempre se crea en draft
// antes de mostrar este widget, ver BlogPostForm).
import { useState, useRef } from 'react';
import useBlogStore from '../../store/blogStore';
import toast from 'react-hot-toast';

export default function BlogCoverUpload({ postId, imageUrl, onImageChange }) {
  const { uploadCover } = useBlogStore();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const displaySrc = preview || imageUrl;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !postId) return;

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const url = await uploadCover(postId, file);
      if (url) {
        onImageChange?.(url);
        toast.success('Portada actualizada');
      } else {
        toast.error('Error al subir la portada');
      }
    } finally {
      setUploading(false);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Portada del artículo</label>

      <div
        onClick={() => !uploading && postId && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-colors ${
          postId ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
        } ${displaySrc ? 'border-transparent' : 'border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50'}`}
        style={{ height: displaySrc ? 'auto' : 140 }}
      >
        {displaySrc ? (
          <div className="relative group">
            <img src={displaySrc} alt="Portada del artículo" className="w-full max-h-56 object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="px-3 py-1.5 bg-white text-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Cambiar
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
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
                  {postId ? (
                    <>Clic para subir la portada<br /><span className="text-gray-400">JPG, PNG, WEBP · máx 5 MB</span></>
                  ) : (
                    'Guarda el artículo como borrador para poder subir la portada'
                  )}
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
