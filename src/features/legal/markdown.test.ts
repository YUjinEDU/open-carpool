import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './markdown';

describe('parseInline', () => {
  it('splits strong and code runs out of plain text', () => {
    expect(parseInline('a **b** and `c` d')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'strong', text: 'b' },
      { kind: 'text', text: ' and ' },
      { kind: 'code', text: 'c' },
      { kind: 'text', text: ' d' },
    ]);
  });

  it('keeps unterminated markers and bracket placeholders literal', () => {
    expect(parseInline('[운영자명] **open')).toEqual([{ kind: 'text', text: '[운영자명] **open' }]);
  });
});

describe('parseMarkdown', () => {
  it('reads headings, a quote, soft-wrapped paragraphs, both list kinds and a table', () => {
    const source = [
      '# Title (template)',
      '',
      '> **Template**, not legal advice.',
      '',
      '## 1. Scope',
      'first line',
      'second line',
      '',
      '- one',
      '- two',
      '',
      '1. **Money.** none',
      '2. Accounts.',
      '',
      '| Category | Data |',
      '|---|---|',
      '| Account | name, email |',
      '',
      'open-carpool `[brackets]` end',
    ].join('\r\n');
    expect(parseMarkdown(source)).toEqual([
      { kind: 'heading', level: 1, inlines: [{ kind: 'text', text: 'Title (template)' }] },
      { kind: 'quote', inlines: [{ kind: 'strong', text: 'Template' }, { kind: 'text', text: ', not legal advice.' }] },
      { kind: 'heading', level: 2, inlines: [{ kind: 'text', text: '1. Scope' }] },
      { kind: 'paragraph', inlines: [{ kind: 'text', text: 'first line second line' }] },
      { kind: 'list', ordered: false, items: [[{ kind: 'text', text: 'one' }], [{ kind: 'text', text: 'two' }]] },
      {
        kind: 'list',
        ordered: true,
        items: [
          [{ kind: 'strong', text: 'Money.' }, { kind: 'text', text: ' none' }],
          [{ kind: 'text', text: 'Accounts.' }],
        ],
      },
      {
        kind: 'table',
        header: [[{ kind: 'text', text: 'Category' }], [{ kind: 'text', text: 'Data' }]],
        rows: [[[{ kind: 'text', text: 'Account' }], [{ kind: 'text', text: 'name, email' }]]],
      },
      { kind: 'paragraph', inlines: [{ kind: 'text', text: 'open-carpool ' }, { kind: 'code', text: '[brackets]' }, { kind: 'text', text: ' end' }] },
    ]);
  });

  it('never emits an empty block for blank or whitespace lines', () => {
    expect(parseMarkdown('\n   \n\n')).toEqual([]);
  });
});
