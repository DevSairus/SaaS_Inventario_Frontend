import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSupportStore from '../../store/supportStore';
import useAuthStore from '../../store/authStore';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';

const SupportFAQ = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { faqCategories, faqLoading, fetchFaq, submitFeedback } = useSupportStore();
  const [search, setSearch] = useState('');
  const [expandedArticle, setExpandedArticle] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  useEffect(() => {
    fetchFaq();
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return faqCategories;
    const q = search.toLowerCase();
    return faqCategories
      .map((cat) => ({
        ...cat,
        articles: cat.articles?.filter(
          (a) => a.question.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.articles?.length > 0);
  }, [faqCategories, search]);

  const handleFeedback = async (articleId, helpful) => {
    const ok = await submitFeedback(articleId, helpful);
    if (ok) {
      setFeedbackGiven((prev) => ({ ...prev, [articleId]: helpful }));
      toast.success('Gracias por tu feedback');
    }
  };

  const canCreateTicket = true;

  return (
    <Layout>
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Centro de Soporte</h1>
        <p className="mt-1 text-sm text-gray-500">Encuentra respuestas a tus preguntas frecuentes</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar en preguntas frecuentes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Escalar a soporte */}
      {canCreateTicket && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-900">¿No encontraste lo que buscabas?</p>
            <p className="text-xs text-indigo-600">Escala tu consulta a nuestro equipo de soporte</p>
          </div>
          <button
            onClick={() => navigate('/support/new-ticket')}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Crear ticket
          </button>
        </div>
      )}

      {/* FAQ Content */}
      {faqLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          <p className="mt-3 text-sm text-gray-500">Cargando FAQ...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">
            {search ? 'No se encontraron resultados para tu búsqueda' : 'No hay artículos de FAQ disponibles'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-800">{category.name}</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {category.articles.map((article) => {
                  const isExpanded = expandedArticle === article.id;
                  const feedback = feedbackGiven[article.id];

                  return (
                    <div key={article.id}>
                      <button
                        onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
                        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-800 pr-4">{article.question}</span>
                        <svg
                          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-4">
                          <p className="text-sm text-gray-600 whitespace-pre-line">{article.answer}</p>
                          <div className="mt-3 flex items-center gap-3">
                            {feedback === undefined ? (
                              <>
                                <span className="text-xs text-gray-400">¿Te fue útil?</span>
                                <button
                                  onClick={() => handleFeedback(article.id, true)}
                                  className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
                                >
                                  Sí
                                </button>
                                <button
                                  onClick={() => handleFeedback(article.id, false)}
                                  className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">Gracias por tu feedback</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link a mis tickets */}
      {canCreateTicket && (
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/support/tickets')}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Ver mis tickets &rarr;
          </button>
        </div>
      )}
    </div>
    </Layout>
  );
};

export default SupportFAQ;
