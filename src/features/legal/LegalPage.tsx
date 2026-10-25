import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PageBody } from '../../app/shell/PageBody';
import { useBack } from '../../app/shell/useBack';
import type { Locale } from '../../domain/types';
import privacyEn from '../../../docs/legal/privacy-policy.en.md?raw';
import privacyKo from '../../../docs/legal/privacy-policy.ko.md?raw';
import termsEn from '../../../docs/legal/terms.en.md?raw';
import termsKo from '../../../docs/legal/terms.ko.md?raw';
import { detectLocale } from '../../shared/i18n';
import { Card, TopBar } from '../../shared/ui';
import { parseMarkdown, type Block, type Inline } from './markdown';

export type LegalDoc = 'terms' | 'privacy';

/** The documents in docs/legal are the source of truth; Vite inlines them as text into this route's chunk. */
const DOCS: Readonly<Record<LegalDoc, Readonly<Record<Locale, string>>>> = {
  terms: { ko: termsKo, en: termsEn },
  privacy: { ko: privacyKo, en: privacyEn },
};

function Inlines({ inlines }: { readonly inlines: readonly Inline[] }) {
  return (
    <>
      {inlines.map((inline, i) =>
        inline.kind === 'strong' ? (
          <strong key={i} className="font-semibold text-ink">
            {inline.text}
          </strong>
        ) : inline.kind === 'code' ? (
          <code key={i} className="rounded-[0.375rem] bg-surface-2 px-1 font-mono">
            {inline.text}
          </code>
        ) : (
          inline.text
        ),
      )}
    </>
  );
}

/** One block of the document in the kit's type scale; the page's h1 is the TopBar title, so "#" renders as h2. */
function BlockView({ block }: { readonly block: Block }): ReactNode {
  switch (block.kind) {
    case 'heading': {
      if (block.level === 1) return <h2 className="text-title-2 text-ink"><Inlines inlines={block.inlines} /></h2>;
      if (block.level === 2) return <h3 className="mt-3 text-title-3 text-ink"><Inlines inlines={block.inlines} /></h3>;
      return <h4 className="mt-2 text-body font-semibold text-ink"><Inlines inlines={block.inlines} /></h4>;
    }
    case 'paragraph':
      return <p className="text-body text-ink"><Inlines inlines={block.inlines} /></p>;
    case 'quote':
      return <blockquote className="rounded-card bg-surface-2 px-4 py-3 text-sub text-ink-2"><Inlines inlines={block.inlines} /></blockquote>;
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`flex flex-col gap-1 pl-5 text-body text-ink ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item, i) => (
            <li key={i}><Inlines inlines={item} /></li>
          ))}
        </Tag>
      );
    }
    case 'table':
      return (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full text-sub">
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th key={i} scope="col" className="border-b border-line px-2 py-2 text-left font-medium text-ink-2"><Inlines inlines={cell} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border-b border-line px-2 py-2 align-top text-ink wrap-anywhere"><Inlines inlines={cell} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** `/legal/terms` and `/legal/privacy`: the documents in the reader's language, reachable signed out. */
export function LegalPage({ doc }: { readonly doc: LegalDoc }) {
  const { t, i18n } = useTranslation();
  const back = useBack('/');
  const source = DOCS[doc][detectLocale(i18n.language)];
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <>
      <TopBar title={t(`ux2.legal.${doc}`)} onBack={back} backLabel={t('nav.back')} />
      <PageBody>
        <Card as="article" padding="lg" className="flex flex-col gap-3" data-testid={`legal-${doc}`}>
          {blocks.map((block, i) => (
            <BlockView key={i} block={block} />
          ))}
        </Card>
      </PageBody>
    </>
  );
}

export const TermsPage = () => <LegalPage doc="terms" />;
export const PrivacyPage = () => <LegalPage doc="privacy" />;
