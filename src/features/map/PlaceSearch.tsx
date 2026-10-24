import { useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { CountryCode } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { geocoderFor, toPlace, type Place } from './geocoder';

export interface PlaceSearchProps {
  /** Input id; also the prefix of every data-testid (`<id>-query`, `-search`, `-result`, `-selected`, `-clear`). */
  readonly id: string;
  readonly label: string;
  readonly country: CountryCode;
  readonly value: Place | null;
  readonly onChange: (place: Place | null) => void;
}

/** Address search through the country's GeocodeProvider; safe to nest inside another form. */
export function PlaceSearch({ id, label, country, value, onChange }: PlaceSearchProps) {
  const { t } = useTranslation();
  const geocoder = useMemo(() => geocoderFor(country), [country]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const search = useAction(async () => {
    setResults((await geocoder.geocode(query)).map(toPlace));
  });

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    search.run();
  };
  const choose = (place: Place) => {
    onChange(place);
    setResults(null);
    setQuery('');
  };

  return (
    <fieldset>
      <legend>{label}</legend>
      {value && (
        <p>
          <span data-testid={`${id}-selected`}>{value.label}</span>{' '}
          <button type="button" onClick={() => onChange(null)} data-testid={`${id}-clear`}>
            {t('place.clear')}
          </button>
        </p>
      )}
      <label htmlFor={id}>{t('place.query')}</label>
      <input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        data-testid={`${id}-query`}
      />
      <button type="button" onClick={() => search.run()} disabled={search.busy || !query.trim()} data-testid={`${id}-search`}>
        {t('place.search')}
      </button>
      {results && results.length === 0 && <p role="status">{t('place.noResults')}</p>}
      {results && results.length > 0 && (
        <ul>
          {results.map((place, i) => (
            <li key={`${place.label}-${i}`}>
              <button type="button" onClick={() => choose(place)} data-testid={`${id}-result`}>
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
