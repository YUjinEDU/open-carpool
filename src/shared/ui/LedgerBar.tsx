import type { ReactNode } from 'react';
import { cx } from './cx';
import type { RootProps } from './types';

export interface LedgerBarProps extends RootProps {
  /** Balance in rides: positive = drove more than their share, negative = rode more. */
  value: number;
  /** Scale: a bar reaches the edge at |value| = max. Use the crew's largest |balance|, at least 1. */
  max?: number;
  /** Formatted balance the user reads, e.g. "+1.5회 더 운전" or "-0.5회". Also the accessible value. */
  label: string;
  /** Member name (data, not UI copy). */
  name: ReactNode;
  /** Avatar slot. */
  leading?: ReactNode;
  /** Secondary text under the name, e.g. "다음 운전 차례" or "이번 주 2회 탑승". */
  detail?: ReactNode;
  /** Highlights the member who drives next. */
  highlight?: boolean;
  className?: string;
}

/**
 * Centred-zero balance bar. Ahead (positive) fills right in brand green; behind (negative) fills left in amber.
 * The sign and label carry the meaning; colour is secondary. Nobody is "in debt": the label says "turn coming" tones, not blame.
 */
export function LedgerBar({ value, max = 2, label, name, leading, detail, highlight = false, className }: LedgerBarProps) {
  const scale = Math.max(Math.abs(max), 0.5);
  const pct = Math.min(Math.abs(value) / scale, 1) * 50;
  const ahead = value > 0;
  const behind = value < 0;
  return (
    <div className={cx('flex items-center gap-3 py-2', className)}>
      {leading && <span className="shrink-0">{leading}</span>}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className={cx('truncate text-body text-ink', highlight ? 'font-semibold' : 'font-medium')}>{name}</span>
          <span className={cx('shrink-0 tabular-nums text-sub font-semibold', ahead ? 'text-accent-ink' : behind ? 'text-warn-ink' : 'text-ink-2')}>{label}</span>
        </div>
        <div
          role="img"
          aria-label={typeof name === 'string' ? `${name}: ${label}` : label}
          className="relative mt-1.5 h-2.5 w-full overflow-hidden rounded-chip bg-surface-3"
        >
          <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line-strong" />
          {ahead && <span aria-hidden="true" className="absolute inset-y-0 left-1/2 rounded-r-chip bg-brand-500" style={{ width: `${pct}%` }} />}
          {behind && <span aria-hidden="true" className="absolute inset-y-0 right-1/2 rounded-l-chip bg-warn-bar" style={{ width: `${pct}%` }} />}
        </div>
        {detail && <p className={cx('mt-1 text-caption', highlight ? 'font-medium text-accent-ink' : 'text-ink-3')}>{detail}</p>}
      </div>
    </div>
  );
}
