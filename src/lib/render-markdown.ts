const RULES: [RegExp, string | ((...m: string[]) => string)][] = [
  [/^### (.+)$/gm, '<h3>$1</h3>'],
  [/^## (.+)$/gm, '<h2>$1</h2>'],
  [/^# (.+)$/gm, '<h1>$1</h1>'],
  [/\*\*(.+?)\*\*/g, '<strong>$1</strong>'],
  [/\*(.+?)\*/g, '<em>$1</em>'],
  [/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />'],
  [/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'],
  [/^---$/gm, '<hr />'],
  [/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>'],
  [/^- (.+)$/gm, '<li>$1</li>'],
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
