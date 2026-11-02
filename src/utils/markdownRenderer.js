// src/utils/markdownRenderer.js
// Módulo plano (sin JSX) para poder importarse tanto desde componentes React
// (BlogPostPage.jsx, vía Vite) como desde scripts/prerender-blog.js (Node
// puro) — misma conversión Markdown→HTML en cliente y en el build SSG.
//
// El título del artículo ya se renderiza como <h1> aparte (fuera del
// Markdown), así que los headings del contenido se corren un nivel (## -> h2
// se queda en h2, pero un # dentro del cuerpo pasa a h2 en vez de duplicar el
// <h1> de la página) — evita dos <h1> compitiendo por el mismo "tema
// principal" de cara a SEO.
import { marked } from 'marked';

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Marked ya entrega escapados el href de los autolinks (<https://...>) y los
// title; se des-escapan primero para no producir &amp;amp; al re-escapar.
const unescapeHtml = (s) =>
  String(s ?? '').replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[e]));
const attr = (s) => escapeHtml(unescapeHtml(s));

// Solo esquemas seguros en href/src: bloquea javascript:, data:, vbscript:, etc.
const safeUrl = (href) => /^(https?:|mailto:|\/|#)/i.test(href || '');

marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const shifted = Math.min(depth + 1, 6);
      return `<h${shifted}>${this.parser.parseInline(tokens)}</h${shifted}>\n`;
    },
    // HTML crudo dentro del Markdown se escapa: el contenido del blog no debe
    // poder inyectar <script>/<iframe>/on*= (XSS). Mismo criterio que
    // legalMarkdown.js. shortcut: cubre HTML a nivel bloque; si algún día el
    // blog acepta autores no confiables, pasar a DOMPurify (maneja también
    // HTML inline y atributos).
    html({ text }) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (!safeUrl(unescapeHtml(href))) return text;
      return `<a href="${attr(href)}"${title ? ` title="${attr(title)}"` : ''}>${text}</a>`;
    },
    image({ href, title, text }) {
      if (!safeUrl(unescapeHtml(href))) return escapeHtml(text);
      return `<img src="${attr(href)}" alt="${attr(text)}"${title ? ` title="${attr(title)}"` : ''} />`;
    },
  },
});

export { marked };
