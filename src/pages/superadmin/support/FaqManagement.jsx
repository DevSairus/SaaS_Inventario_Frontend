import { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Loader2,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useSuperAdminSupportStore from '../../../store/superAdminSupportStore';

const emptyCategory = { name: '', order: 0, is_active: true };
const emptyArticle = { question: '', answer: '', order: 0, is_active: true };

export default function FaqManagement() {
  const {
    faqCategories,
    faqLoading,
    fetchFaqCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createArticle,
    updateArticle,
    deleteArticle,
  } = useSuperAdminSupportStore();

  const [expandedCat, setExpandedCat] = useState(null);
  const [catModal, setCatModal] = useState({ open: false, editing: null, form: { ...emptyCategory } });
  const [artModal, setArtModal] = useState({ open: false, editing: null, categoryId: null, form: { ...emptyArticle } });

  useEffect(() => {
    fetchFaqCategories();
  }, [fetchFaqCategories]);

  /* ── Categorías ── */
  const openCreateCategory = () => setCatModal({ open: true, editing: null, form: { ...emptyCategory } });

  const openEditCategory = (cat) => setCatModal({
    open: true,
    editing: cat.id,
    form: { name: cat.name, order: cat.order ?? 0, is_active: cat.is_active ?? true },
  });

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría y todos sus artículos?')) return;
    const ok = await deleteCategory(id);
    if (ok) toast.success('Categoría eliminada');
    else toast.error('Error al eliminar');
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    const { editing, form } = catModal;
    const ok = editing
      ? await updateCategory(editing, form)
      : await createCategory(form);
    if (ok) {
      toast.success(editing ? 'Categoría actualizada' : 'Categoría creada');
      setCatModal({ open: false, editing: null, form: { ...emptyCategory } });
    } else {
      toast.error('Error al guardar');
    }
  };

  /* ── Artículos ── */
  const openCreateArticle = (categoryId) => setArtModal({
    open: true,
    editing: null,
    categoryId,
    form: { ...emptyArticle },
  });

  const openEditArticle = (article, categoryId) => setArtModal({
    open: true,
    editing: article.id,
    categoryId,
    form: {
      question: article.question ?? '',
      answer: article.answer ?? '',
      order: article.order ?? 0,
      is_active: article.is_active ?? true,
    },
  });

  const handleDeleteArticle = async (id) => {
    if (!window.confirm('¿Eliminar este artículo?')) return;
    const ok = await deleteArticle(id);
    if (ok) toast.success('Artículo eliminado');
    else toast.error('Error al eliminar');
  };

  const handleArtSubmit = async (e) => {
    e.preventDefault();
    const { editing, categoryId, form } = artModal;
    const payload = { ...form, category_id: categoryId };
    const ok = editing
      ? await updateArticle(editing, payload)
      : await createArticle(payload);
    if (ok) {
      toast.success(editing ? 'Artículo actualizado' : 'Artículo creado');
      setArtModal({ open: false, editing: null, categoryId: null, form: { ...emptyArticle } });
    } else {
      toast.error('Error al guardar');
    }
  };

  /* ── Render ── */
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
            <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de FAQ</h1>
            <p className="text-sm text-gray-500 dark:text-gray-500">Administra categorías y artículos de ayuda</p>
          </div>
        </div>
        <button
          onClick={openCreateCategory}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </button>
      </div>

      {/* Loading */}
      {faqLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Empty state */}
      {!faqLoading && faqCategories.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 dark:bg-graphite-2 dark:border-white/10">
          <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3 dark:text-gray-600" />
          <p className="text-gray-500 font-medium dark:text-gray-500">No hay categorías de FAQ</p>
          <p className="text-gray-400 text-sm mt-1 dark:text-gray-500">Crea la primera categoría para comenzar</p>
        </div>
      )}

      {/* Categories list */}
      <div className="space-y-3">
        {faqCategories.map((cat) => {
          const isOpen = expandedCat === cat.id;
          const articles = cat.articles || [];

          return (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden dark:bg-graphite dark:border-white/10">
              {/* Category header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  onClick={() => setExpandedCat(isOpen ? null : cat.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate dark:text-gray-100">{cat.name}</h3>
                    {!cat.is_active && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full dark:bg-white/10 dark:text-gray-400">Inactiva</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 dark:text-gray-500">
                    {articles.length} artículo{articles.length !== 1 ? 's' : ''} · Orden: {cat.order ?? 0}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openCreateArticle(cat.id)}
                    title="Nuevo artículo"
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors dark:text-gray-500 dark:hover:text-green-400 dark:hover:bg-green-900/20"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditCategory(cat)}
                    title="Editar categoría"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    title="Eliminar categoría"
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Articles */}
              {isOpen && (
                <div className="border-t border-gray-100 dark:border-white/10">
                  {articles.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-6 dark:text-gray-500">Sin artículos en esta categoría</p>
                  )}
                  {articles.map((art) => (
                    <div
                      key={art.id}
                      className="flex items-start gap-3 px-5 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <MessageSquare className="w-4 h-4 text-gray-300 mt-0.5 shrink-0 dark:text-gray-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate dark:text-gray-200">{art.question}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 dark:text-gray-500">{art.answer}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                            <ThumbsUp className="w-3 h-3" /> {art.helpful_count ?? 0}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                            <ThumbsDown className="w-3 h-3" /> {art.not_helpful_count ?? 0}
                          </span>
                          {!art.is_active && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded dark:bg-white/10 dark:text-gray-400">Inactivo</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditArticle(art, cat.id)}
                          title="Editar"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(art.id)}
                          title="Eliminar"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal Categoría ── */}
      {catModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCatModal({ open: false, editing: null, form: { ...emptyCategory } })}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 dark:bg-graphite" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/10">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {catModal.editing ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button onClick={() => setCatModal({ open: false, editing: null, form: { ...emptyCategory } })} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCatSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Nombre</label>
                <input
                  type="text"
                  value={catModal.form.name}
                  onChange={(e) => setCatModal((p) => ({ ...p, form: { ...p.form, name: e.target.value } }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Orden</label>
                  <input
                    type="number"
                    value={catModal.form.order}
                    onChange={(e) => setCatModal((p) => ({ ...p, form: { ...p.form, order: Number(e.target.value) } }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catModal.form.is_active}
                      onChange={(e) => setCatModal((p) => ({ ...p, form: { ...p.form, is_active: e.target.checked } }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:border-white/10"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Activa</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModal({ open: false, editing: null, form: { ...emptyCategory } })}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors dark:text-gray-300 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={faqLoading}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {faqLoading ? 'Guardando...' : catModal.editing ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Artículo ── */}
      {artModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setArtModal({ open: false, editing: null, categoryId: null, form: { ...emptyArticle } })}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 dark:bg-graphite" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/10">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {artModal.editing ? 'Editar Artículo' : 'Nuevo Artículo'}
              </h3>
              <button onClick={() => setArtModal({ open: false, editing: null, categoryId: null, form: { ...emptyArticle } })} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleArtSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Pregunta</label>
                <input
                  type="text"
                  value={artModal.form.question}
                  onChange={(e) => setArtModal((p) => ({ ...p, form: { ...p.form, question: e.target.value } }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Respuesta</label>
                <textarea
                  value={artModal.form.answer}
                  onChange={(e) => setArtModal((p) => ({ ...p, form: { ...p.form, answer: e.target.value } }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Orden</label>
                  <input
                    type="number"
                    value={artModal.form.order}
                    onChange={(e) => setArtModal((p) => ({ ...p, form: { ...p.form, order: Number(e.target.value) } }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={artModal.form.is_active}
                      onChange={(e) => setArtModal((p) => ({ ...p, form: { ...p.form, is_active: e.target.checked } }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:border-white/10"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Activo</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setArtModal({ open: false, editing: null, categoryId: null, form: { ...emptyArticle } })}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors dark:text-gray-300 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={faqLoading}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {faqLoading ? 'Guardando...' : artModal.editing ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
