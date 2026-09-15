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

marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const shifted = Math.min(depth + 1, 6);
      return `<h${shifted}>${this.parser.parseInline(tokens)}</h${shifted}>\n`;
    },
  },
});

export { marked };
