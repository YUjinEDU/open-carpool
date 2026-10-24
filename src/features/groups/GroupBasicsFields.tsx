import { useTranslation } from 'react-i18next';
import type { CountryCode, GroupType } from '../../domain/types';
import { COUNTRIES, countryName, GROUP_TYPES } from './options';

export interface GroupBasics {
  readonly name: string;
  readonly type: GroupType;
  readonly country: CountryCode;
}

export interface GroupBasicsFieldsProps {
  /** Prefix of input ids and data-testids: `<prefix>-name`, `-type`, `-country`. */
  readonly prefix: string;
  readonly value: GroupBasics;
  readonly onChange: (value: GroupBasics) => void;
}

const isGroupType = (v: string): v is GroupType => GROUP_TYPES.some((type) => type === v);

export function GroupBasicsFields({ prefix, value, onChange }: GroupBasicsFieldsProps) {
  const { t, i18n } = useTranslation();
  const countries = COUNTRIES.includes(value.country) ? COUNTRIES : [value.country, ...COUNTRIES];
  return (
    <>
      <label htmlFor={`${prefix}-name`}>{t('group.name')}</label>
      <input
        id={`${prefix}-name`}
        required
        maxLength={80}
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        data-testid={`${prefix}-name`}
      />
      <label htmlFor={`${prefix}-type`}>{t('group.type')}</label>
      <select
        id={`${prefix}-type`}
        value={value.type}
        onChange={(e) => isGroupType(e.target.value) && onChange({ ...value, type: e.target.value })}
        data-testid={`${prefix}-type`}
      >
        {GROUP_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`groupType.${type}`)}
          </option>
        ))}
      </select>
      <label htmlFor={`${prefix}-country`}>{t('group.country')}</label>
      <select
        id={`${prefix}-country`}
        value={value.country}
        onChange={(e) => onChange({ ...value, country: e.target.value })}
        data-testid={`${prefix}-country`}
      >
        {countries.map((code) => (
          <option key={code} value={code}>
            {countryName(code, i18n.language)}
          </option>
        ))}
      </select>
    </>
  );
}
