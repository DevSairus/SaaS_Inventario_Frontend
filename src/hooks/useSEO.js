// src/hooks/useSEO.js
// Actualiza document.title, meta description, canonical y JSON-LD Article
// del <head> en cliente. No usa react-helmet-async a propósito: la
// indexabilidad "real" para el blog viene del HTML pre-renderizado por
// scripts/prerender-blog.js (Opción B) — esto solo mantiene coherente el
// <head> cuando alguien navega dentro de la SPA sin recargar la página.
import { useEffect } from 'react';

const upsertMeta = (name, content) => {
  if (!content) return null;
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
  return tag;
};

const upsertCanonical = (href) => {
  if (!href) return null;
  let tag = document.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
  return tag;
};

export default function useSEO({ title, description, canonical, jsonLd } = {}) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;

    const descTag = upsertMeta('description', description);
    const canonicalTag = upsertCanonical(canonical);

    let jsonLdScript = null;
    if (jsonLd) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      document.title = previousTitle;
      descTag?.remove();
      canonicalTag?.remove();
      jsonLdScript?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, canonical, JSON.stringify(jsonLd)]);
}
