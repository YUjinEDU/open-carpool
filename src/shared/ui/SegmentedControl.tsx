import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group, e.g. "구간". */
  label: string;
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  /** data-testid on the radiogroup for end-to-end scripts. */
  testId?: string;
}

/** Mutually exclusive choice, 2-4 options. Radio semantics with arrow-key movement. */
export function SegmentedControl<T extends string>({ options, value, onChange, label, size = 'md', fullWidth = true, className, testId }: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
    const pos = enabled.indexOf(index);
    let next: number | undefined;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = enabled[(pos + 1) % enabled.length];
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = enabled[(pos - 1 + enabled.length) % enabled.length];
    if (event.key === 'Home') next = enabled[0];
    if (event.key === 'End') next = enabled[enabled.length - 1];
    if (next === undefined) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
      className={cx('inline-grid grid-flow-col auto-cols-fr gap-1 rounded-control bg-surface-2 p-1', fullWidth && 'w-full', className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => { refs.current[index] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cx(
              'rounded-[0.5rem] px-3 font-medium transition-[background-color,color,box-shadow] duration-150 disabled:opacity-45',
              size === 'md' ? 'h-9 text-sub' : 'h-11 text-body',
              selected ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(21_25_22/0.10)]' : 'text-ink-2 hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
