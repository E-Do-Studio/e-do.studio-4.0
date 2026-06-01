// Files that Strapi's media library uploads but whose extensions aren't
// markdown-image syntax (`![](…)`): editors attach them via the regular link
// shortcut, which produces `[name.mov](url)`. We promote those links to
// `<video>` so the file plays inline instead of rendering as a hyperlink to
// download. Match is case-insensitive and tolerates a trailing query string
// (Strapi's R2 URLs sometimes carry signed-URL params).
const VIDEO_LINK_RE = /\[([^\]]+)\]\(([^)\s]+?\.(?:mp4|mov|webm|ogg|m4v)(?:\?[^)\s]*)?)\)/gi;

const RULES: [RegExp, string | ((...m: string[]) => string)][] = [
  [/^### (.+)$/gm, '<h3>$1</h3>'],
  [/^## (.+)$/gm, '<h2>$1</h2>'],
  [/^# (.+)$/gm, '<h1>$1</h1>'],
  [/\*\*(.+?)\*\*/g, '<strong>$1</strong>'],
  [/__(.+?)__/g, '<strong>$1</strong>'],
  [/\*(.+?)\*/g, '<em>$1</em>'],
  [/(^|[^\w])_(?!_)(.+?)_(?!\w)/g, '$1<em>$2</em>'],
  [/`([^`]+)`/g, '<code>$1</code>'],
  [/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />'],
  [VIDEO_LINK_RE, '<video src="$2" controls preload="metadata" playsinline aria-label="$1"></video>'],
  [/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'],
  [/^---$/gm, '<hr />'],
  [/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>'],
  [/^- (.+)$/gm, '<li>$1</li>'],
];

const INLINE_RULES: [RegExp, string][] = [
  [/\*\*(.+?)\*\*/g, '<strong>$1</strong>'],
  [/__(.+?)__/g, '<strong>$1</strong>'],
  [/\*(.+?)\*/g, '<em>$1</em>'],
  [/(^|[^\w])_(?!_)(.+?)_(?!\w)/g, '$1<em>$2</em>'],
  [/`([^`]+)`/g, '<code>$1</code>'],
  [/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'],
];

export function renderMarkdown(md: string): string {
  if (!md) return '';
  let html = md;
  for (const [regex, replacement] of RULES) {
    html = html.replace(regex, replacement as string);
  }
  html = html.replace(/(<li>.+<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/(?:^|\n\n)([^<\n].+?)(?=\n\n|$)/g, (_, p) => `\n<p>${p.trim()}</p>\n`);
  return html.trim();
}

// Inline-only variant: handles bold/italic/code/links, never emits block tags.
// Use it for short fields like excerpt/title rendered inside an existing
// element where adding <p>/<h*> would break the layout.
export function renderInlineMarkdown(md: string): string {
  if (!md) return '';
  let html = md;
  for (const [regex, replacement] of INLINE_RULES) {
    html = html.replace(regex, replacement);
  }
  return html;
}
