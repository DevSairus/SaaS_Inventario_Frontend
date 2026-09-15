// src/pages/BlogPostPage.jsx — Ruta pública: /blog/:slug
import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { marked } from '../utils/markdownRenderer';
import { getPublicPostBySlug } from '../api/blog';
import useSEO from '../hooks/useSEO';
import { C, FONT_IMPORT_STYLE } from './blog/blogTheme';

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getPublicPostBySlug(slug)
      .then((data) => {
        if (data.success) {
          setPost(data.post);
          setRelated(data.related || []);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    // El HTML pre-renderizado (Opción B) mete el contenido del artículo en
    // #blog-ssg-content para que crawlers/scrapers lo vean sin ejecutar JS.
    // Una vez React terminó de montar la versión interactiva, ese nodo
    // estático queda redundante y hay que quitarlo para no duplicar contenido
    // visible en pantalla.
    if (post) {
      document.getElementById('blog-ssg-content')?.remove();
    }
  }, [post]);

  const canonical = `${window.location.origin}/blog/${slug}`;

  useSEO({
    title: post ? `${post.meta_title || post.title} | Pitbox` : undefined,
    description: post ? (post.meta_description || post.excerpt) : undefined,
    canonical,
    jsonLd: post ? {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.meta_description || post.excerpt,
      image: post.cover_image_url ? [post.cover_image_url] : undefined,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: { '@type': 'Organization', name: 'Pitbox' },
    } : undefined,
  });

  if (notFound) return <Navigate to="/blog" replace />;

  return (
    <div style={{ margin: 0, padding: 0, background: C.gray50, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        ${FONT_IMPORT_STYLE}
        .blog-article h2 { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: 700; color: ${C.gray900}; margin: 32px 0 12px; }
        .blog-article h3 { font-family: 'Space Grotesk', sans-serif; font-size: 1.2rem; font-weight: 700; color: ${C.gray900}; margin: 24px 0 10px; }
        .blog-article p { color: ${C.gray700}; line-height: 1.7; margin-bottom: 16px; }
        .blog-article ul, .blog-article ol { color: ${C.gray700}; line-height: 1.7; margin: 0 0 16px 24px; }
        .blog-article a { color: ${C.accent}; }
        .blog-article img { max-width: 100%; border-radius: 12px; margin: 16px 0; }
        .blog-article code { background: ${C.gray100}; padding: 2px 6px; border-radius: 4px; }
      `}</style>

      <header style={{ background: C.ink, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/bienvenida" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700, color: C.white, textDecoration: 'none' }}>
          Pitbox
        </Link>
        <Link to="/registro" style={{
          fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: C.white,
          background: C.accent, padding: '10px 18px', borderRadius: 8, textDecoration: 'none',
        }}>
          Solicitar demo →
        </Link>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        {loading || !post ? (
          <p style={{ color: C.gray500 }}>Cargando artículo…</p>
        ) : (
          <>
            <Link to="/blog" style={{ color: C.gray500, fontSize: 14, textDecoration: 'none' }}>← Volver al blog</Link>

            {post.category && (
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 16 }}>
                {post.category}
              </div>
            )}

            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 700, color: C.gray900, margin: '8px 0 16px' }}>
              {post.title}
            </h1>

            <p style={{ color: C.gray400, fontSize: 13, marginBottom: 24 }}>
              {new Date(post.published_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              {' · '}{post.reading_time_minutes} min de lectura
            </p>

            {post.cover_image_url && (
              <img src={post.cover_image_url} alt={post.title} style={{ width: '100%', borderRadius: 16, marginBottom: 32 }} />
            )}

            <div className="blog-article" dangerouslySetInnerHTML={{ __html: marked.parse(post.content || '') }} />

            <div style={{ marginTop: 48, padding: 24, background: C.ink, borderRadius: 16, textAlign: 'center' }}>
              <p style={{ color: C.white, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
                ¿Quieres ver Pitbox funcionando en tu taller?
              </p>
              <Link to="/registro" style={{
                display: 'inline-block', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: C.white,
                background: C.accent, padding: '12px 24px', borderRadius: 8, textDecoration: 'none',
              }}>
                Solicitar demo →
              </Link>
            </div>

            {related.length > 0 && (
              <div style={{ marginTop: 48 }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: C.gray900, marginBottom: 16 }}>
                  Artículos relacionados
                </h2>
                <div style={{ display: 'grid', gap: 16 }}>
                  {related.map((r) => (
                    <Link key={r.id} to={`/blog/${r.slug}`} style={{ color: C.gray900, fontWeight: 600, textDecoration: 'none' }}>
                      {r.title} →
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default BlogPostPage;
