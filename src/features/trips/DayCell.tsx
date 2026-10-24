import { dayCell } from '../../shared/lib/format';
import { cx } from '../../shared/ui';

export interface DayCellProps {
  readonly date: string;
  readonly locale: string;
  /** The next trip gets the accent wash. */
  readonly highlight?: boolean;
}

/** Leading calendar cell of a trip row: weekday above the day of month. */
export function DayCell({ date, locale, highlight = false }: DayCellProps) {
  const { weekday, day } = dayCell(date, locale);
  return (
    <span className={cx('flex w-11 shrink-0 flex-col items-center rounded-control py-1', highlight ? 'bg-accent-wash text-accent-ink' : 'text-ink-2')}>
      <span className="text-caption font-medium">{weekday}</span>
      <span className="text-body font-semibold tabular-nums">{day}</span>
    </span>
  );
}
