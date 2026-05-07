// Strapi 5 "blocks" field renderer.
// Strapi blocks are a JSON tree of nodes; this renderer covers the subset
// the editorial team uses: paragraph, heading, list (ordered/unordered),
// quote, code, link, image, plus inline marks (bold, italic, underline,
// strikethrough, code).

import { Fragment, createElement, type ReactNode } from 'react';

export type BlockNode =
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; children: InlineNode[] }
  | { type: 'list'; format: 'ordered' | 'unordered'; children: ListItemNode[] }
  | { type: 'quote'; children: InlineNode[] }
  | { type: 'code'; children: InlineNode[] }
  | { type: 'image'; image: { url: string; alternativeText?: string | null; width?: number; height?: number } };

export type ListItemNode = { type: 'list-item'; children: InlineNode[] };

export type InlineNode =
  | { type: 'text'; text: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; code?: boolean }
  | { type: 'link'; url: string; children: InlineNode[] };

function renderInline(node: InlineNode, key: string | number): ReactNode {
  if (node.type === 'link') {
    return createElement(
      'a',
      { key, href: node.url, target: '_blank', rel: 'noopener noreferrer' },
      node.children.map((child, i) => renderInline(child, `${key}-${i}`)),
    );
  }
  let element: ReactNode = node.text ?? '';
  if (node.code) element = createElement('code', { key: `${key}-c` }, element);
  if (node.bold) element = createElement('strong', { key: `${key}-b` }, element);
  if (node.italic) element = createElement('em', { key: `${key}-i` }, element);
  if (node.underline) element = createElement('u', { key: `${key}-u` }, element);
  if (node.strikethrough) element = createElement('s', { key: `${key}-s` }, element);
  return createElement(Fragment, { key }, element);
}

function renderInlineChildren(children: InlineNode[], parentKey: string | number): ReactNode[] {
  return children.map((c, i) => renderInline(c, `${parentKey}-${i}`));
}

export function renderStrapiBlocks(blocks: BlockNode[] | null | undefined): ReactNode {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  return blocks.map((block, i) => {
    const key = `b-${i}`;
    switch (block.type) {
      case 'paragraph':
        return createElement('p', { key }, renderInlineChildren(block.children, key));
      case 'heading':
        return createElement(
          `h${block.level}` as keyof JSX.IntrinsicElements,
          { key },
          renderInlineChildren(block.children, key),
        );
      case 'list': {
        const Tag = block.format === 'ordered' ? 'ol' : 'ul';
        return createElement(
          Tag,
          { key },
          (block.children ?? []).map((item, j) =>
            createElement('li', { key: `${key}-li-${j}` }, renderInlineChildren(item.children, `${key}-li-${j}`)),
          ),
        );
      }
      case 'quote':
        return createElement('blockquote', { key }, renderInlineChildren(block.children, key));
      case 'code':
        return createElement(
          'pre',
          { key },
          createElement('code', null, renderInlineChildren(block.children, key)),
        );
      case 'image':
        return createElement('img', {
          key,
          src: block.image.url,
          alt: block.image.alternativeText ?? '',
          width: block.image.width,
          height: block.image.height,
          loading: 'lazy',
        });
      default:
        return null;
    }
  });
}
