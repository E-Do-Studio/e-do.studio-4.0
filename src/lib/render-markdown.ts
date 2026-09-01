// Files that Strapi's media library uploads but whose extensions aren't
// markdown-image syntax (`![](…)`): editors attach them via the regular link
// shortcut, which produces `[name.mov](url)`. We promote those links to
// `<video>` so the file plays inline instead of rendering as a hyperlink to
// download. Match is case-insensitive and tolerates a trailing query string
// (Strapi's R2 URLs sometimes carry signed-URL params).
const VIDEO_LINK_RE =
  /\[([^\]]+)\]\(([^)\s]+?\.(?:mp4|mov|webm|ogg|m4v)(?:\?[^)\s]*)?)\)/gi;

// A caption is the alt/label text — but Strapi pre-fills alt with the uploaded
// filename, which must not show. Anything ending in a file extension is treated
// as "no real caption".
// ─── Échappement ────────────────────────────────────────────────────────────
//
// La sortie de ce module part dans `dangerouslySetInnerHTML`
// (discovery-post-page.tsx, discovery/tiles.tsx) et son entrée est du contenu
// éditorial Strapi. Toute valeur interpolée doit donc être neutralisée :
// jusqu'ici une URL d'image pouvait fermer son attribut et injecter un
// `onerror=`, et un lien acceptait le schéma `javascript:`.

/** Neutralise une valeur destinée à un attribut HTML entre guillemets. */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Neutralise une valeur destinée à du contenu textuel. */
function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Seuls http(s), mailto, tel et les chemins relatifs sont acceptés. Tout le
// reste — `javascript:`, `data:`, `vbscript:` — retombe sur un lien inerte
// plutôt que d'être émis tel quel.
const SAFE_URL_RE = /^(?:https?:|mailto:|tel:|[/#.?]|[^a-z0-9+.-]*$)/i;

function safeUrl(url: string): string {
  const trimmed = url.trim();
  // Un schéma s'écrit `nom:` avant tout `/` — s'il n'y en a pas, l'URL est
  // relative, donc sûre.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  if (hasScheme && !SAFE_URL_RE.test(trimmed)) return '';
  return escapeAttr(trimmed);
}

const isFilename = (s: string) => /\.[a-z0-9]{2,4}(?:\?.*)?$/i.test(s.trim());
const captionTag = (text: string) =>
  text && !isFilename(text)
    ? `<figcaption>${escapeText(text)}</figcaption>`
    : '';

const RULES: [RegExp, string | ((...m: string[]) => string)][] = [
  [/^### (.+)$/gm, '<h3>$1</h3>'],
  [/^## (.+)$/gm, '<h2>$1</h2>'],
  [/^# (.+)$/gm, '<h1>$1</h1>'],
  [/\*\*(.+?)\*\*/g, '<strong>$1</strong>'],
  [/__(.+?)__/g, '<strong>$1</strong>'],
  [/\*(.+?)\*/g, '<em>$1</em>'],
  [/(^|[^\w])_(?!_)(.+?)_(?!\w)/g, '$1<em>$2</em>'],
  [/`([^`]+)`/g, '<code>$1</code>'],
  [
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_m: string, alt: string, url: string) =>
      `<figure class="edo-fig"><img src="${safeUrl(url)}" alt="${escapeAttr(alt)}" loading="lazy" tabindex="0" role="button" />${captionTag(alt)}</figure>`,
  ],
  [
    VIDEO_LINK_RE,
    (_m: string, label: string, url: string) =>
      `<figure class="edo-fig"><video src="${safeUrl(url)}" controls preload="metadata" playsinline aria-label="${escapeAttr(label)}"></video>${captionTag(label)}</figure>`,
  ],
  [
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m: string, label: string, url: string) =>
      `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  ],
  [/^---$/gm, '<hr />'],
  [/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>'],
  [/^- (.+)$/gm, '<li>$1</li>'],
];

const INLINE_RULES: [RegExp, string | ((...m: string[]) => string)][] = [
  [/\*\*(.+?)\*\*/g, '<strong>$1</strong>'],
  [/__(.+?)__/g, '<strong>$1</strong>'],
  [/\*(.+?)\*/g, '<em>$1</em>'],
  [/(^|[^\w])_(?!_)(.+?)_(?!\w)/g, '$1<em>$2</em>'],
  [/`([^`]+)`/g, '<code>$1</code>'],
  [
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m: string, label: string, url: string) =>
      `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  ],
];

// Lines that are already block-level HTML (opening or closing tag) must not be
// re-wrapped in <p>. Inline-leading lines (<strong>, <a>, …) are still prose.
const BLOCK_LINE_RE =
  /^<\/?(h[1-3]|ul|ol|li|blockquote|hr|img|video|figure|pre|table)[\s/>]/;

export function renderMarkdown(md: string): string {
  if (!md) return '';
  let html = md;
  for (const [regex, replacement] of RULES) {
    html = html.replace(regex, replacement as string);
  }
  html = html.replace(/(<li>.+<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  // Strapi editors press Enter once between paragraphs, so the body separates
  // paragraphs with single newlines (not blank lines). Wrap each text line in
  // its own <p> — giving it the vertical rhythm — while leaving block-level HTML
  // lines (headings, list markup, quotes, media) untouched.
  const blocks = html
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (BLOCK_LINE_RE.test(trimmed)) return trimmed;
      return `<p>${trimmed}</p>`;
    })
    .filter(Boolean);
  // Several images in a row (no text between them) become a responsive grid.
  // A lone image stays full-width.
  const out: string[] = [];
  let imgRun: string[] = [];
  const flushImgs = () => {
    if (imgRun.length === 1) out.push(imgRun[0]);
    else if (imgRun.length > 1)
      out.push(`<div class="edo-img-grid">${imgRun.join('')}</div>`);
    imgRun = [];
  };
  for (const block of blocks) {
    if (block.startsWith('<figure') && block.includes('<img'))
      imgRun.push(block);
    else {
      flushImgs();
      out.push(block);
    }
  }
  flushImgs();
  return out.join('\n').trim();
}

// Inline-only variant: handles bold/italic/code/links, never emits block tags.
// Use it for short fields like excerpt/title rendered inside an existing
// element where adding <p>/<h*> would break the layout.
export function renderInlineMarkdown(md: string): string {
  if (!md) return '';
  let html = md;
  for (const [regex, replacement] of INLINE_RULES) {
    html = html.replace(regex, replacement as string);
  }
  return html;
}
