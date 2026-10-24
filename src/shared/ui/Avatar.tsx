import type { ReactNode } from 'react';
import { cx } from './cx';
import type { RootProps } from './types';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends RootProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  /** auto = deterministic identity tint from the name; neutral = one calm grey for everyone. */
  tint?: 'auto' | 'neutral';
  /** Small glyph badge at the bottom-right (for example <Car /> on tomorrow's driver). State by glyph, never by outline. */
  marker?: ReactNode;
  /** 1 = first syllable or initial only (stacks, xs); 2 = default. */
  initialsLength?: 1 | 2;
}

const SIZE: Record<AvatarSize, string> = {
  xs: 'size-6 text-[0.625rem]',
  sm: 'size-8 text-caption',
  md: 'size-10 text-sub',
  lg: 'size-12 text-body',
  xl: 'size-16 text-title-2',
};

const TINTS = ['avatar-tint-1', 'avatar-tint-2', 'avatar-tint-3', 'avatar-tint-4', 'avatar-tint-5'];

const HANGUL = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;

/**
 * Display initials. Korean names show the given name (surname dropped from 3+ syllable names) so
 * crews full of 김/이/박 stay distinguishable; Latin names show up to two initials.
 */
export function initialsFor(name: string, maxChars = 2): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (HANGUL.test(trimmed)) {
    const compact = trimmed.replace(/\s+/g, '');
    const given = compact.length >= 3 ? compact.slice(1) : compact;
    return Array.from(given).slice(0, maxChars).join('');
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  const letters = words.length >= 2 ? [words[0][0], words[words.length - 1][0]] : [words[0][0]];
  return letters.slice(0, maxChars).join('').toUpperCase();
}

function hashName(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h;
}

export function Avatar({ name, src, size = 'md', tint = 'auto', marker, initialsLength, className, ...rest }: AvatarProps) {
  const tintClass = tint === 'auto' ? TINTS[hashName(name) % TINTS.length] : 'bg-surface-3 text-ink-2';
  return (
    <span
      role="img"
      aria-label={name}
      className={cx(
        'relative inline-grid shrink-0 select-none place-items-center rounded-chip font-semibold leading-none',
        SIZE[size],
        !src && tintClass,
        className,
      )}
      {...rest}
    >
      {src ? <img src={src} alt="" className="size-full rounded-chip object-cover" /> : <span aria-hidden="true">{initialsFor(name, initialsLength ?? (size === 'xs' ? 1 : 2))}</span>}
      {marker && (
        <span
          aria-hidden="true"
          className={cx(
            'absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-chip bg-accent text-on-accent ring-2 ring-surface',
            size === 'xl' ? 'size-6 [&_svg]:size-3.5' : size === 'lg' ? 'size-5 [&_svg]:size-3' : 'size-4 [&_svg]:size-2.5',
          )}
        >
          {marker}
        </span>
      )}
    </span>
  );
}

export interface AvatarStackPerson {
  name: string;
  src?: string | null;
}

export interface AvatarStackProps extends RootProps {
  people: ReadonlyArray<AvatarStackPerson>;
  max?: number;
  size?: Exclude<AvatarSize, 'xl' | 'lg'>;
}

/** Overlapping avatars with a "+N" tail. The accessible name lists everyone. */
export function AvatarStack({ people, max = 4, size = 'sm', className, ...rest }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const rest_ = people.length - shown.length;
  const names = people.map((p) => p.name).join(', ');
  return (
    <span role="img" aria-label={names} className={cx('inline-flex items-center', className)} {...rest}>
      {shown.map((person, index) => (
        <Avatar
          key={person.name + index}
          name={person.name}
          src={person.src}
          size={size}
          initialsLength={size === 'md' ? 2 : 1}
          aria-hidden="true"
          role="presentation"
          className={cx('ring-2 ring-surface', index > 0 && '-ml-1.5')}
        />
      ))}
      {rest_ > 0 && (
        <span
          aria-hidden="true"
          className={cx(
            'inline-grid place-items-center rounded-chip bg-surface-3 font-semibold text-ink-2 ring-2 ring-surface',
            size === 'xs' ? '-ml-1.5 size-6 text-[0.625rem]' : size === 'sm' ? '-ml-1.5 size-8 text-caption' : '-ml-1.5 size-10 text-sub',
          )}
        >
          +{rest_}
        </span>
      )}
    </span>
  );
}
