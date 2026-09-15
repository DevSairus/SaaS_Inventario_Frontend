// src/pages/superadmin/BlogPostForm.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import useBlogStore from '../../store/blogStore';
import BlogCoverUpload from '../../components/blog/BlogCoverUpload';
import toast from 'react-hot-toast';

const slugify = (text) => String(text || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const EMPTY_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  category: '',
  tags: '',
  meta_title: '',
  meta_description: '',
  focus_keyword: '',
};

const BlogPostForm = () => {
  const { id } = useParams();
  const isNew = !id || id === 'nuevo';
  const navigate = useNavigate();
  const { currentPost, isLoading, error, fetchPost, createPost, updatePost, publishPost, clearError } = useBlogStore();

  const [postId, setPostId] = useState(isNew ? null : id);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    if (!isNew) {
      fetchPost(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!isNew && currentPost) {
      setForm({
        title: currentPost.title || '',
        slug: currentPost.slug || '',
        excerpt: currentPost.excerpt || '',
        content: currentPost.content || '',
        cover_image_url: currentPost.cover_image_url || '',
        category: currentPost.category || '',
        tags: (currentPost.tags || []).join(', '),
        meta_title: currentPost.meta_title || '',
        meta_description: currentPost.meta_description || '',
        focus_keyword: currentPost.focus_keyword || '',
      });
      setSlugTouched(true);
    }
  }, [currentPost, isNew]);

  const handleTitleChange = (value) => {
    setForm((f) => ({
      ...f,
      title: value,
      slug: slugTouched ? f.slug : slugify(value),
    }));
  };

  const buildPayload = useCallback(() => ({
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    content: form.content,
    category: form.category,
    tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    meta_title: form.meta_title,
    meta_description: form.meta_description,
    focus_keyword: form.focus_keyword,
  }), [form]);

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    clearError();

    if (isNew && !postId) {
      const created = await createPost(buildPayload());
      if (created) {
        toast.success('Borrador creado');
        setPostId(created.id);
        navigate(`/superadmin/blog/${created.id}`, { replace: true });
      } else if (error) {
        toast.error('Error: ' + error);
      }
      return;
    }

    const updated = await updatePost(postId, buildPayload());
    if (updated) toast.success('Cambios guardados');
    else if (error) toast.error('Error: ' + error);
  };

  const handlePublish = async () => {
    if (!postId) {
      toast.error('Guarda el borrador antes de publicar');
      return;
    }
    clearError();
    await updatePost(postId, buildPayload());
    const result = await publishPost(postId, scheduledAt || null);
    if (result?.success) {
      toast.success(result.message || 'Artículo publicado');
      navigate('/superadmin/blog');
    } else {
      toast.error(result?.message || 'No se pudo publicar');
    }
  };

  const metaTitleLen = (form.meta_title || form.title).length;
  const metaDescLen = (form.meta_description || form.excerpt).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isNew ? 'Nuevo artículo' : 'Editar artículo'}
        </h1>
        <button onClick={() => navigate('/superadmin/blog')} className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver al listado
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSaveDraft} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej: Facturación electrónica DIAN para talleres de motos"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Slug (URL)</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">/blog/</span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <BlogCoverUpload
          postId={postId}
          imageUrl={form.cover_image_url}
          onImageChange={(url) => setForm((f) => ({ ...f, cover_image_url: url }))}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resumen (excerpt)</label>
          <textarea
            rows={2}
            maxLength={300}
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Resumen corto para el listado y la meta description por defecto"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contenido (Markdown) *</label>
          <div data-color-mode="light">
            <MDEditor
              value={form.content}
              onChange={(value) => setForm((f) => ({ ...f, content: value || '' }))}
              height={420}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Facturación DIAN"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags (separados por coma)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="dian, facturación, talleres"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">SEO</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Palabra clave objetivo (solo referencia interna)</label>
            <input
              type="text"
              value={form.focus_keyword}
              onChange={(e) => setForm((f) => ({ ...f, focus_keyword: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="software para taller de motos"
            />
          </div>

          <div className="mb-4">
            <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Meta title</span>
              <span className={metaTitleLen > 70 ? 'text-red-500' : 'text-gray-400'}>{metaTitleLen}/70</span>
            </label>
            <input
              type="text"
              maxLength={70}
              value={form.meta_title}
              onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder={form.title || 'Si se deja vacío, usa el título'}
            />
          </div>

          <div className="mb-4">
            <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Meta description</span>
              <span className={metaDescLen > 160 ? 'text-red-500' : 'text-gray-400'}>{metaDescLen}/160</span>
            </label>
            <textarea
              rows={2}
              maxLength={160}
              value={form.meta_description}
              onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder={form.excerpt || 'Si se deja vacío, usa el resumen'}
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Vista previa en Google</p>
            <p className="text-blue-700 text-lg truncate">{form.meta_title || form.title || 'Título del artículo'}</p>
            <p className="text-green-700 text-sm">pitbox.esc-datacore.com/blog/{form.slug || 'slug'}</p>
            <p className="text-sm text-gray-600 line-clamp-2">{form.meta_description || form.excerpt || 'Meta description del artículo...'}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 flex flex-wrap items-center gap-4">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            title="Fecha de publicación programada (opcional, vacío = ahora)"
          />
          <div className="flex-1" />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
          >
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isLoading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50"
          >
            {scheduledAt ? 'Programar publicación' : 'Publicar ahora'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BlogPostForm;
