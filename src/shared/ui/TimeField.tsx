import { forwardRef } from 'react';
import { Clock } from 'lucide-react';
import { cx } from './cx';
import { Input, type InputProps } from './Input';

export interface TimeFieldProps extends Omit<InputProps, 'type' | 'leading' | 'inputMode'> {
  /** Minute granularity for the native picker; 5-minute steps keep commute times tidy. */
  stepMinutes?: number;
  /** Leading clock glyph; turn it off in tight grids (two fields per row on a phone). */
  icon?: boolean;
}

/** Native time input ("HH:MM"). iOS and Android open their own wheel picker, which is faster than any custom one. */
export const TimeField = forwardRef<HTMLInputElement, TimeFieldProps>(function TimeField(
  { stepMinutes = 5, icon = true, className, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="time"
      step={stepMinutes * 60}
      leading={icon ? <Clock /> : undefined}
      className={cx('tabular-nums [&::-webkit-date-and-time-value]:text-left [&::-webkit-calendar-picker-indicator]:opacity-0', className)}
      {...rest}
    />
  );
});
