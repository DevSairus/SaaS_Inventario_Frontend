// src/pages/superadmin/BlogManagement.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useBlogStore from '../../store/blogStore';
import toast from 'react-hot-toast';

const STATUS_LABEL = {
  draft: 'Borrador',
  scheduled: 'Programado',
  published: 'Publicado',
};

const STATUS_COLOR = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
};

const BlogManagement = () => {
  const { posts, isLoading, error, fetchPosts, deletePost, publishPost, unpublishPost, clearError } = useBlogStore();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchPosts(statusFilter ? { status: statusFilter } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleDelete = async (id, title) => {
    if (window.confirm(`¿Eliminar el artículo "${title}"?\n\nEsta acción no se puede deshacer.`)) {
      const success = await deletePost(id);
      if (success) toast.success('Artículo eliminado');
      else if (error) toast.error('Error al eliminar: ' + error);
    }
  };

  const handlePublish = async (post) => {
    clearError();
    const result = await publishPost(post.id);
    if (result?.success) {
      toast.success(result.message || 'Artículo publicado');
    } else {
      toast.error(result?.message || 'No se pudo publicar el artículo');
    }
  };

  const handleUnpublish = async (post) => {
    const success = await unpublishPost(post.id);
    if (success) toast.success('Artículo despublicado');
    else if (error) toast.error('Error al despublicar: ' + error);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Blog</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">Artículos editoriales para SEO (pitbox.esc-datacore.com/blog)</p>
          </div>
          <button
            onClick={() => navigate('/superadmin/blog/nuevo')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo artículo
          </button>
        </div>

        <div className="flex gap-2">
          {['', 'draft', 'scheduled', 'published'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s ? STATUS_LABEL[s] : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando artículos...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-graphite rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-12 text-center">
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No hay artículos</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">Comienza escribiendo el primer artículo del blog.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white dark:bg-graphite rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{post.title}</h3>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${STATUS_COLOR[post.status]}`}>
                      {STATUS_LABEL[post.status]}
                    </span>
                    {post.category && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-graphite-2 text-gray-700 dark:text-gray-300">
                        {post.category}
                      </span>
                    )}
                  </div>
                  {post.excerpt && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{post.excerpt}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    /blog/{post.slug} · {post.reading_time_minutes} min de lectura
                    {post.published_at ? ` · ${new Date(post.published_at).toLocaleDateString('es-CO')}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {post.status === 'published' ? (
                    <button
                      onClick={() => handleUnpublish(post)}
                      className="px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-50 rounded-lg transition-colors"
                    >
                      Despublicar
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePublish(post)}
                      className="px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      Publicar
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/superadmin/blog/${post.id}`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
