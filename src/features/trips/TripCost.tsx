import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { splitActualCost } from '../../domain/cost';
import { moneyFeaturesEnabled } from '../../domain/policies';
import type { CountryCode, Group, Trip, TripCost as Cost } from '../../domain/types';

const CURRENCY_BY_COUNTRY: Readonly<Record<CountryCode, string>> = {
  JP: 'JPY', TW: 'TWD', SG: 'SGD', US: 'USD', CA: 'CAD', GB: 'GBP', DE: 'EUR', FR: 'EUR', AU: 'AUD',
};

export interface TripCostProps {
  readonly group: Pick<Group, 'country' | 'policy'>;
  readonly trip: Trip;
  readonly names: ReadonlyMap<string, string>;
  readonly onSave: (cost: Cost) => void;
}

/** Optional fuel/toll cost of a done trip and its split. Renders nothing unless money features are on (never in KR). */
export function TripCost({ group, trip, names, onSave }: TripCostProps) {
  const { t, i18n } = useTranslation();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(CURRENCY_BY_COUNTRY[group.country.toUpperCase()] ?? 'USD');
  const allowed = moneyFeaturesEnabled(group);
  if (!allowed || trip.status !== 'done' || trip.driverId === null) return null;

  if (trip.cost) {
    const split = splitActualCost({ cost: trip.cost, driverId: trip.driverId, riderIds: trip.riderIds, allowed });
    const money = new Intl.NumberFormat(i18n.language, { style: 'currency', currency: split.currency });
    return (
      <ul data-testid="trip-cost-split">
        {Object.entries(split.riderOwes).map(([uid, owed]) => (
          <li key={uid}>{t('trip.cost.owes', { name: names.get(uid) ?? uid, amount: money.format(owed) })}</li>
        ))}
      </ul>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ totalAmount: Number(amount), currency: currency.trim().toUpperCase() });
  };
  return (
    <form onSubmit={onSubmit} data-testid="trip-cost-form">
      <label htmlFor={`trip-cost-${trip.id}`}>{t('trip.cost.amount')}</label>
      <input
        id={`trip-cost-${trip.id}`}
        type="number"
        min={0}
        step="any"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        data-testid="trip-cost-amount"
      />
      <label htmlFor={`trip-currency-${trip.id}`}>{t('trip.cost.currency')}</label>
      <input
        id={`trip-currency-${trip.id}`}
        required
        pattern="[A-Za-z]{3}"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
      />
      <button type="submit" data-testid="trip-cost-save">
        {t('trip.cost.save')}
      </button>
    </form>
  );
}
