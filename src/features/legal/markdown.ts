/**
 * The subset of Markdown the legal documents in docs/legal use: ATX headings (#, ##, ###), paragraphs,
 * blockquotes, "-" and "1." lists, pipe tables, **strong** and `code`. Anything else stays literal text,
 * so a template placeholder like "[운영자명]" is shown as written. No HTML is produced or interpreted.
 */

export type Inline = { readonly kind: 'text' | 'strong' | 'code'; readonly text: string };

export type Block =
  | { readonly kind: 'heading'; readonly level: 1 | 2 | 3; readonly inlines: readonly Inline[] }
  | { readonly kind: 'paragraph'; readonly inlines: readonly Inline[] }
  | { readonly kind: 'quote'; readonly inlines: readonly Inline[] }
  | { readonly kind: 'list'; readonly ordered: boolean; readonly items: ReadonlyArray<readonly Inline[]> }
  | { readonly kind: 'table'; readonly header: ReadonlyArray<readonly Inline[]>; readonly rows: ReadonlyArray<ReadonlyArray<readonly Inline[]>> };

const INLINE = /\*\*(.+?)\*\*|`([^`]+)`/g;

/** "a **b** `c`" -> text a, strong b, code c. Unterminated markers stay literal. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ kind: 'text', text: text.slice(last, index) });
    if (match[1] !== undefined) out.push({ kind: 'strong', text: match[1] });
    else if (match[2] !== undefined) out.push({ kind: 'code', text: match[2] });
    last = index + match[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

const splitRow = (line: string): string[] => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
const isSeparatorRow = (cells: readonly string[]): boolean => cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let quote: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let table: { header: string[]; rows: string[][] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', inlines: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };
  const flushQuote = () => {
    if (quote.length) blocks.push({ kind: 'quote', inlines: parseInline(quote.join(' ')) });
    quote = [];
  };
  const flushList = () => {
    if (list) blocks.push({ kind: 'list', ordered: list.ordered, items: list.items.map(parseInline) });
    list = null;
  };
  const flushTable = () => {
    if (table) blocks.push({ kind: 'table', header: table.header.map(parseInline), rows: table.rows.map((row) => row.map(parseInline)) });
    table = null;
  };
  const flushAll = () => {
    flushParagraph();
    flushQuote();
    flushList();
    flushTable();
  };

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim() === '') {
      flushAll();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushAll();
      blocks.push({ kind: 'heading', level: heading[1].length as 1 | 2 | 3, inlines: parseInline(heading[2].trim()) });
      continue;
    }
    const quoted = /^>\s?(.*)$/.exec(line);
    if (quoted) {
      flushParagraph();
      flushList();
      flushTable();
      quote.push(quoted[1].trim());
      continue;
    }
    const item = /^(?:[-*]|(\d+)\.)\s+(.+)$/.exec(line);
    if (item) {
      const ordered = item[1] !== undefined;
      flushParagraph();
      flushQuote();
      flushTable();
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push(item[2].trim());
      continue;
    }
    if (/^\|.*\|\s*$/.test(line)) {
      flushParagraph();
      flushQuote();
      flushList();
      const cells = splitRow(line);
      if (!table) table = { header: cells, rows: [] };
      else if (!isSeparatorRow(cells)) table.rows.push(cells);
      continue;
    }
    flushQuote();
    flushList();
    flushTable();
    paragraph.push(line.trim());
  }
  flushAll();
  return blocks;
}
