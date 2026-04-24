// Server-side HTML sanitizer for user-authored content (CMS pages, etc.).
//
// We allow a standard "rich text" set: headings, lists, links, images,
// tables, blockquotes, inline formatting. Everything else (script, style,
// iframe without allow-list, event handlers, javascript: URLs, data: URLs
// for non-images) is stripped by sanitize-html.

import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "strong", "em", "b", "i", "u", "s", "mark", "small", "sub", "sup",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
  "div", "span",
];

const ALLOWED_ATTRS: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "name", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  "*": ["class", "id"],
  td: ["colspan", "rowspan", "align"],
  th: ["colspan", "rowspan", "scope", "align"],
};

/**
 * Sanitize user-authored HTML to a safe subset. Use on every CMS / rich-text
 * field before rendering with dangerouslySetInnerHTML.
 */
export function sanitizeUserHtml(raw: string): string {
  if (!raw) return "";
  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    // Force safe link behaviour on all anchors.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      }),
    },
    disallowedTagsMode: "discard",
  });
}
