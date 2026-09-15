// src/pages/BlogListPage.jsx — Ruta pública: /blog
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicPosts } from '../api/blog';
import useSEO from '../hooks/useSEO';
import { C, FONT_IMPORT_STYLE } from './blog/blogTheme';

const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPublicPosts(category ? { category } : {})
      .then((data) => {
        if (data.success) {
          setPosts(data.posts);
          setCategories((prev) => {
            const found = new Set(prev);
            data.posts.forEach((p) => p.category && found.add(p.category));
            return Array.from(found);
          });
        }
      })
      .finally(() => setLoading(false));
  }, [category]);

  useSEO({
    title: 'Blog Pitbox — Software para talleres de motos y facturación DIAN',
    description: 'Guías y buenas prácticas para gestionar tu taller: facturación electrónica DIAN, control de inventario y administración de vehículos.',
    canonical: `${window.location.origin}/blog`,
  });

  return (
    <div style={{ margin: 0, padding: 0, background: C.gray50, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT_STYLE}</style>

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

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 700, color: C.gray900, marginBottom: 8 }}>
          Blog
        </h1>
        <p style={{ color: C.gray500, marginBottom: 32 }}>
          Guías prácticas sobre gestión de talleres, facturación electrónica DIAN e inventario.
        </p>

        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            <button
              onClick={() => setCategory('')}
              style={{
                padding: '6px 14px', borderRadius: 999, border: `1px solid ${C.gray200}`,
                background: category === '' ? C.ink : C.white, color: category === '' ? C.white : C.gray700,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '6px 14px', borderRadius: 999, border: `1px solid ${C.gray200}`,
                  background: category === cat ? C.ink : C.white, color: category === cat ? C.white : C.gray700,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p style={{ color: C.gray500 }}>Cargando artículos…</p>
        ) : posts.length === 0 ? (
          <p style={{ color: C.gray500 }}>Todavía no hay artículos publicados.</p>
        ) : (
          <div style={{ display: 'grid', gap: 24 }}>
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                style={{
                  display: 'flex', gap: 20, background: C.white, borderRadius: 16,
                  border: `1px solid ${C.gray200}`, padding: 20, textDecoration: 'none', alignItems: 'center',
                }}
              >
                {post.cover_image_url && (
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    style={{ width: 160, height: 100, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                  />
                )}
                <div>
                  {post.category && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {post.category}
                    </span>
                  )}
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: C.gray900, margin: '4px 0 8px' }}>
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p style={{ color: C.gray500, fontSize: 14, marginBottom: 8 }}>{post.excerpt}</p>
                  )}
                  <p style={{ color: C.gray400, fontSize: 12 }}>
                    {new Date(post.published_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {' · '}{post.reading_time_minutes} min de lectura
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BlogListPage;
