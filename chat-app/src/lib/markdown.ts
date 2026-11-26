import { marked } from "marked";
import DOMPurify from "dompurify";

// Renderiza markdown a HTML seguro (sanitizado) para mensajes de chat.
// Soporta: formato básico, code, listas, menciones @usuario, emojis.
marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdown(text: string): string {
  if (!text) return "";
  const raw = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "code", "pre", "a", "ul", "ol", "li",
      "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "span", "div", "del",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
  });
}

// Convierte @usuario en un markup resaltable (lo deja como texto; el render
// del componente puede envolverlo). Para simplicity aquí solo se deja el texto.
export function highlightMentions(html: string): string {
  return html.replace(/@([A-Za-z0-9_]{3,20})/g, '<span class="mention">@$1</span>');
}
