import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import i18n from '../../shared/i18n';
import { LegalPage } from './LegalPage';

describe('LegalPage', () => {
  it.each(['terms', 'privacy'] as const)('renders the %s document from docs/legal as headings and text, never raw markdown', async (doc) => {
    await i18n.changeLanguage('ko');
    render(
      <MemoryRouter>
        <LegalPage doc={doc} />
      </MemoryRouter>,
    );
    const article = screen.getByTestId(`legal-${doc}`);
    expect(article.querySelectorAll('h2, h3').length).toBeGreaterThan(3);
    expect(article.textContent).not.toMatch(/\*\*|^#|\|---/m);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(i18n.t(`ux2.legal.${doc}`));
  });
});
