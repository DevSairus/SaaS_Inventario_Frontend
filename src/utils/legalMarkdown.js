// src/utils/legalMarkdown.js
// Markdown de los documentos legales (habeas data / acta de ingreso) a HTML.
// Instancia propia de Marked -- no la global de markdownRenderer.js (que
// corre los headings para el blog) -- y sin HTML crudo ni enlaces que no
// sean http(s)/mailto: el documento propio de un tenant se muestra en la
// página pública a sus clientes.
import { Marked } from 'marked';

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const legalMarked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (!/^(https?:|mailto:)/i.test(href || '')) return text;
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${title ? ` title="${escapeHtml(title)}"` : ''}>${text}</a>`;
    },
    image({ text }) {
      return escapeHtml(text);
    },
  },
});

export const renderLegalMarkdown = (md) => legalMarked.parse(md || '');
