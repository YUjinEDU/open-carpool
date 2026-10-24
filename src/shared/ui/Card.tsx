import type { ReactNode } from 'react';
import { cx } from './cx';
import type { RootProps } from './types';

export type CardVariant = 'default' | 'tonal' | 'inverse';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends RootProps {
  /** default = white surface with a hairline; tonal = sunken surface, no border; inverse = the deep green "evening" surface. */
  variant?: CardVariant;
  padding?: CardPadding;
  as?: 'div' | 'section' | 'article' | 'li';
  children?: ReactNode;
}

const VARIANT: Record<CardVariant, string> = {
  default: 'bg-surface border border-line',
  tonal: 'bg-surface-2',
  inverse: 'tone-inverse',
};

const PADDING: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({ variant = 'default', padding = 'md', as: Tag = 'div', className, children, ...rest }: CardProps) {
  return (
    <Tag className={cx('rounded-card text-ink', VARIANT[variant], PADDING[padding], className)} {...rest}>
      {children}
    </Tag>
  );
}

export interface CardHeaderProps extends Omit<RootProps, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** Usually a ghost Button such as "전체 보기". */
  action?: ReactNode;
  className?: string;
  /** Heading level for the title; defaults to h2. */
  as?: 'h2' | 'h3' | 'h4';
}

export function CardHeader({ title, description, action, className, as: Heading = 'h2' }: CardHeaderProps) {
  return (
    <div className={cx('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <Heading className="text-title-3 text-ink">{title}</Heading>
        {description && <p className="mt-0.5 text-sub text-ink-2">{description}</p>}
      </div>
      {action && <div className="-my-1 -mr-2 shrink-0">{action}</div>}
    </div>
  );
}
