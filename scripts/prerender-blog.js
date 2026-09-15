// scripts/prerender-blog.js
//
// Opción B del blog (SSG dirigido, ver 00 - Documentación/Blog-Superadmin-
// Analisis-y-Plan.md): corre DESPUÉS de `vite build` (ver "build" en
// package.json). Para cada post publicado, genera dist/blog/<slug>/index.html
// con meta tags reales + el contenido del artículo ya convertido a HTML,
// para que Google y los scrapers de WhatsApp/redes vean contenido real en el
// primer byte sin depender de que se ejecute el JS de la SPA. React sigue
// montando la versión interactiva sobre #root normalmente al hidratar en el
// cliente (ver BlogPostPage.jsx, que remueve el bloque estático apenas carga
// sus propios datos).
//
// Si no hay VITE_API_URL configurada, o el backend no responde, el build NO
// falla: simplemente no se generan páginas de blog pre-renderizadas (el
// build normal de la SPA ya corrió antes de este script).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from '../src/utils/markdownRenderer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');

// En Vercel, VITE_API_URL ya llega como variable de entorno real. En local,
// `vite build` lee .env por su cuenta para inyectarla en el bundle del
// cliente, pero este script corre como un proceso Node aparte -- sin esto,
// `npm run build` en local nunca vería la URL del backend.
function loadDotEnvFallback() {
  if (process.env.VITE_API_URL) return;
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim().replace(/^["']|["']$/g, '');
    }
  }
}
loadDotEnvFallback();

const SITE_ORIGIN = process.env.VITE_SITE_ORIGIN || 'https://pitbox.esc-datacore.com';
const API_URL = process.env.VITE_API_URL;

const escapeHtml = (str) => String(str || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function fetchPublishedPosts() {
  if (!API_URL) {
    console.warn('[prerender-blog] VITE_API_URL no configurada — se omite el pre-render del blog.');
    return [];
  }
  try {
    const res = await fetch(`${API_URL}/public/blog?limit=1000`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.success ? data.posts : [];
  } catch (err) {
    console.warn('[prerender-blog] No se pudo obtener la lista de posts publicados:', err.message);
    return [];
  }
}

async function fetchPostDetail(slug) {
  const res = await fetch(`${API_URL}/public/blog/${slug}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.success ? data.post : null;
}

function buildPostHtml(template, post) {
  const url = `${SITE_ORIGIN}/blog/${post.slug}`;
  const title = escapeHtml(post.meta_title || post.title);
  const description = escapeHtml(post.meta_description || post.excerpt || '');
  const image = post.cover_image_url || `${SITE_ORIGIN}/brand/pitbox-og.png`;

  let html = template;

  html = html.replace(/<title>.*?<\/title>/s, `<title>${title} | Pitbox</title>`);
  html = html.replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${description}" />`);
  html = html.replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${url}" />`);
  html = html.replace(/<meta property="og:type" content=".*?" \/>/, `<meta property="og:type" content="article" />`);
  html = html.replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${url}" />`);
  html = html.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title}" />`);
  html = html.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description}" />`);
  html = html.replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${image}" />`);
  html = html.replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title}" />`);
  html = html.replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${description}" />`);
  html = html.replace(/<meta name="twitter:image" content=".*?" \/>/, `<meta name="twitter:image" content="${image}" />`);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    image: [image],
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Organization', name: 'Pitbox' },
    publisher: { '@type': 'Organization', name: 'ESC DataCore' },
    mainEntityOfPage: url,
  };

  const contentHtml = marked.parse(post.content || '');
  const ssgBlock = `
    <div id="blog-ssg-content">
      <h1>${escapeHtml(post.title)}</h1>
      ${post.cover_image_url ? `<img src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}" />` : ''}
      ${contentHtml}
    </div>
    <script type="application/ld+json">${JSON.stringify(articleJsonLd)}</script>
  `;

  html = html.replace('<div id="root"></div>', `${ssgBlock}\n    <div id="root"></div>`);

  return html;
}

function buildBlogSitemap(posts) {
  const urls = posts.map((post) => `  <url>
    <loc>${SITE_ORIGIN}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at || post.published_at).toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.warn('[prerender-blog] dist/ no existe todavía — ¿corriste esto antes de "vite build"?');
    return;
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  const template = fs.readFileSync(indexPath, 'utf-8');

  const postsList = await fetchPublishedPosts();
  if (postsList.length === 0) {
    console.log('[prerender-blog] No hay posts publicados — nada que pre-renderizar.');
    return;
  }

  let generated = 0;
  for (const summary of postsList) {
    try {
      const post = await fetchPostDetail(summary.slug);
      if (!post) continue;

      const html = buildPostHtml(template, post);
      const postDir = path.join(DIST_DIR, 'blog', post.slug);
      fs.mkdirSync(postDir, { recursive: true });
      fs.writeFileSync(path.join(postDir, 'index.html'), html);
      generated++;
    } catch (err) {
      console.warn(`[prerender-blog] Error generando "${summary.slug}":`, err.message);
    }
  }

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap-blog.xml'), buildBlogSitemap(postsList));

  console.log(`[prerender-blog] ${generated}/${postsList.length} artículos pre-renderizados + sitemap-blog.xml generado.`);
}

main();
