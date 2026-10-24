import type { ReactNode } from 'react';
import { cx, type RootProps } from '../../shared/ui';

export interface PageBodyProps extends RootProps {
  /** Inside the group shell: clears the fixed BottomNav. */
  nav?: boolean;
  /** Admin and settings screens: max-w-5xl instead of the phone column. */
  wide?: boolean;
  children?: ReactNode;
}

/** The page column under a TopBar: centred phone width, 16px gutter, sections 16px apart. */
export function PageBody({ nav = false, wide = false, className, children, ...rest }: PageBodyProps) {
  return (
    <main
      className={cx('mx-auto flex w-full flex-col gap-4 px-4 pt-4', wide ? 'max-w-5xl' : 'max-w-md', nav ? 'pb-safe-nav' : 'pb-10', className)}
      {...rest}
    >
      {children}
    </main>
  );
}
