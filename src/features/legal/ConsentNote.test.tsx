import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import i18n from '../../shared/i18n';
import { ConsentNote } from './ConsentNote';

describe('ConsentNote', () => {
  it('turns the named parts of the sentence into in-app links to the two documents', async () => {
    await i18n.changeLanguage('ko');
    render(
      <MemoryRouter>
        <ConsentNote />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/legal/terms', '/legal/privacy']);
    expect(links.every((a) => a.textContent && a.textContent.length > 0)).toBe(true);
    expect(screen.getByTestId('consent-note').textContent).not.toMatch(/<\/?(terms|privacy)>/);
  });
});
