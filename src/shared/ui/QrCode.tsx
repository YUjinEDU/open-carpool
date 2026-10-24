import { useEffect, useState } from 'react';
import { cx } from './cx';
import { Skeleton } from './Skeleton';

export interface QrCodeProps {
  /** Text encoded in the code, usually an absolute URL. */
  value: string;
  /** Accessible description, e.g. "초대 QR 코드". */
  label: string;
  /** Rendered size in px (the SVG scales; this sets width and height). */
  size?: number;
  className?: string;
}

/**
 * QR code as an inline SVG image. The generator (the `qrcode` package) loads on first use so the
 * main bundle stays small; while it loads, a skeleton of the same size holds the layout.
 */
export function QrCode({ value, label, size = 176, className }: QrCodeProps) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    import('qrcode')
      .then((mod) => mod.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }))
      .then((svg) => {
        if (active) setSrc(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => {
      active = false;
    };
  }, [value]);
  const box = { width: size, height: size };
  if (!src) return <Skeleton className={cx('rounded-control', className)} style={box} />;
  return <img src={src} alt={label} width={size} height={size} style={box} className={cx('rounded-control bg-white', className)} />;
}
