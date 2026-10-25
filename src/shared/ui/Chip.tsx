import { forwardRef, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cx } from './cx';
import type { PressableProps } from './types';

export interface ChipProps extends Omit<PressableProps, 'type'> {
  children?: ReactNode;
  selected?: boolean;
  /**
   * Inline check glyph when selected (default), so state is never colour alone. false: a compact corner
   * marker instead, for dense rows such as the seven weekday chips, where seven inline checks would not fit.
   */
  showCheck?: boolean;
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

/** Toggle chip (weekdays, filters). aria-pressed carries the state. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected = false, showCheck = true, size = 'md', icon, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-chip border font-medium whitespace-nowrap',
        'transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-45 disabled:pointer-events-none',
        size === 'md' ? 'h-11 min-w-11 px-3.5 text-sub' : 'h-9 min-w-9 px-3 text-caption',
        selected
          ? 'border-accent-wash-strong bg-accent-wash-strong text-accent-ink font-semibold'
          : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      {selected && showCheck ? <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> : icon && <span aria-hidden="true" className="inline-flex [&_svg]:size-4">{icon}</span>}
      {children}
      {selected && !showCheck && (
        <span aria-hidden="true" className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-chip bg-accent text-on-accent">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
});

export interface ChipOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  /** data-testid for end-to-end scripts. */
  testId?: string;
}

export interface ChipGroupProps<T extends string> {
  options: ReadonlyArray<ChipOption<T>>;
  value: ReadonlyArray<T>;
  onChange: (value: T[]) => void;
  /** Accessible name of the group, e.g. "출근 요일". */
  label: string;
  /** false = single select (clears others). */
  multiple?: boolean;
  size?: 'sm' | 'md';
  showCheck?: boolean;
  className?: string;
}

/** Wrapping cluster of chips. Weekday chips: 7 options, multiple, in Mon..Sun order. */
export function ChipGroup<T extends string>({ options, value, onChange, label, multiple = true, size, showCheck, className }: ChipGroupProps<T>) {
  const toggle = (v: T) => {
    const has = value.includes(v);
    if (!multiple) {
      onChange(has ? [] : [v]);
      return;
    }
    onChange(has ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <div role="group" aria-label={label} className={cx('flex flex-wrap gap-2', className)}>
      {options.map((option) => (
        <Chip
          key={option.value}
          size={size}
          showCheck={showCheck}
          selected={value.includes(option.value)}
          disabled={option.disabled}
          onClick={() => toggle(option.value)}
          data-testid={option.testId}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
