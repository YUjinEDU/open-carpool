import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cx } from './cx';
import { IconButton } from './IconButton';
import type { RootProps } from './types';

export type BannerVariant = 'info' | 'warn' | 'success' | 'danger';

export interface BannerProps extends Omit<RootProps, 'title' | 'role'> {
  variant?: BannerVariant;
  title?: ReactNode;
  children?: ReactNode;
  /** Usually one secondary or ghost Button (md: the action is a 44px target like every other control). */
  action?: ReactNode;
  icon?: ReactNode;
  onDismiss?: () => void;
  /** Accessible name of the dismiss control, e.g. "닫기". Required when onDismiss is set. */
  dismissLabel?: string;
  className?: string;
}

const VARIANT: Record<BannerVariant, { box: string; icon: ReactNode; role: 'status' | 'alert' }> = {
  info: { box: 'bg-info-wash text-info-ink', icon: <Info />, role: 'status' },
  warn: { box: 'bg-warn-wash text-warn-ink', icon: <AlertTriangle />, role: 'alert' },
  success: { box: 'bg-success-wash text-success-ink', icon: <CheckCircle2 />, role: 'status' },
  danger: { box: 'bg-danger-wash text-danger-ink', icon: <AlertCircle />, role: 'alert' },
};

/** Inline message on a tonal wash with a leading glyph. No side stripe, ever. */
export function Banner({ variant = 'info', title, children, action, icon, onDismiss, dismissLabel = '', className, ...rest }: BannerProps) {
  const spec = VARIANT[variant];
  return (
    <div role={spec.role} className={cx('flex items-start gap-3 rounded-card p-4', spec.box, className)} {...rest}>
      <span aria-hidden="true" className="mt-0.5 inline-flex shrink-0 [&_svg]:size-5">
        {icon ?? spec.icon}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-body font-semibold">{title}</p>}
        {children && <div className={cx('text-sub', title && 'mt-0.5')}>{children}</div>}
        {action && <div className="mt-3 [&>button]:bg-current/10 [&>button]:text-current [&>button:hover]:bg-current/15">{action}</div>}
      </div>
      {onDismiss && <IconButton label={dismissLabel} icon={<X />} onClick={onDismiss} className="-my-2 -mr-2 text-current hover:bg-black/5" />}
    </div>
  );
}
