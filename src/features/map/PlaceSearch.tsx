import { useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Search, X } from 'lucide-react';
import type { CountryCode } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { EmptyState, IconButton, Input, List, ListItem } from '../../shared/ui';
import { geocoderFor, toPlace, type Place } from './geocoder';

export interface PlaceSearchProps {
  /** Input id; also the prefix of every data-testid (`<id>-query`, `-search`, `-result`, `-selected`, `-clear`). */
  readonly id: string;
  readonly label: string;
  /** Hide the label visually when a card title already names the field. */
  readonly labelHidden?: boolean;
  readonly hint?: string;
  readonly country: CountryCode;
  readonly value: Place | null;
  readonly onChange: (place: Place | null) => void;
}

/** Address search through the country's GeocodeProvider; safe to nest inside another form. */
export function PlaceSearch({ id, label, labelHidden = false, hint, country, value, onChange }: PlaceSearchProps) {
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
    if (query.trim()) search.run();
  };
  const choose = (place: Place) => {
    onChange(place);
    setResults(null);
    setQuery('');
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        id={id}
        label={label}
        labelHidden={labelHidden}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={t('place.query')}
        hint={hint}
        leading={<MapPin />}
        trailing={
          <IconButton
            label={t('place.search')}
            icon={<Search />}
            variant="ghost"
            disabled={search.busy || !query.trim()}
            onClick={() => search.run()}
            data-testid={`${id}-search`}
          />
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        data-testid={`${id}-query`}
      />
      {value && (
        <div className="flex items-center gap-3 rounded-control bg-accent-wash px-3 py-1.5 text-sub text-accent-ink">
          <MapPin aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-medium" data-testid={`${id}-selected`}>
            {value.label}
          </span>
          <IconButton label={t('place.clear')} icon={<X />} onClick={() => onChange(null)} className="-my-1 -mr-1 text-accent-ink hover:bg-accent-wash-strong" data-testid={`${id}-clear`} />
        </div>
      )}
      {results && results.length === 0 && <EmptyState compact title={t('place.noResults')} description={t('place.manualHint')} />}
      {results && results.length > 0 && (
        <List>
          {results.map((place, i) => (
            <ListItem
              key={`${place.label}-${i}`}
              leading={<MapPin aria-hidden="true" className="size-5" />}
              title={place.label}
              onClick={() => choose(place)}
              data-testid={`${id}-result`}
            />
          ))}
        </List>
      )}
    </div>
  );
}
