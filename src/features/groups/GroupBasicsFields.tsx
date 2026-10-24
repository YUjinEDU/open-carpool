import { useTranslation } from 'react-i18next';
import type { CountryCode, GroupType } from '../../domain/types';
import { Input, Select } from '../../shared/ui';
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
  /** Validation message under the name field. */
  readonly nameError?: string;
  readonly countryReadOnly?: boolean;
}

const isGroupType = (v: string): v is GroupType => GROUP_TYPES.some((type) => type === v);

export function GroupBasicsFields({ prefix, value, onChange, nameError, countryReadOnly = false }: GroupBasicsFieldsProps) {
  const { t, i18n } = useTranslation();
  const countries = COUNTRIES.includes(value.country) ? COUNTRIES : [value.country, ...COUNTRIES];
  return (
    <>
      <Input
        id={`${prefix}-name`}
        label={t('group.name')}
        required
        maxLength={80}
        autoComplete="organization"
        error={nameError}
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        data-testid={`${prefix}-name`}
      />
      <Select
        id={`${prefix}-type`}
        label={t('group.type')}
        value={value.type}
        onChange={(e) => isGroupType(e.target.value) && onChange({ ...value, type: e.target.value })}
        data-testid={`${prefix}-type`}
      >
        {GROUP_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`groupType.${type}`)}
          </option>
        ))}
      </Select>
      <Select
        id={`${prefix}-country`}
        label={t('group.country')}
        value={value.country}
        disabled={countryReadOnly}
        onChange={(e) => onChange({ ...value, country: e.target.value })}
        data-testid={`${prefix}-country`}
      >
        {countries.map((code) => (
          <option key={code} value={code}>
            {countryName(code, i18n.language)}
          </option>
        ))}
      </Select>
    </>
  );
}
