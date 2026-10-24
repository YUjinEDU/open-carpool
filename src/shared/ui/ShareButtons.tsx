import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { cx } from './cx';
import { Button } from './Button';

export interface ShareLabels {
  copy: string;
  copied: string;
  share: string;
}

export interface ShareButtonsProps {
  url: string;
  title?: string;
  text?: string;
  labels: ShareLabels;
  /** QR code node rendered by the feature (SVG or <img>). Shown above the buttons when present. */
  qr?: ReactNode;
  /** Short invite code shown under the QR in a selectable monospace block. */
  code?: ReactNode;
  onCopied?: () => void;
  onShared?: () => void;
  className?: string;
  /** data-testids for end-to-end scripts. */
  testIds?: { copy?: string; share?: string; qr?: string };
}

/** Copy to the clipboard with the legacy execCommand fallback. Returns false when both paths fail. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } finally {
    document.body.removeChild(area);
  }
  return ok;
}

/** Copy link + Web Share (when the platform has it) + optional QR slot. */
export function ShareButtons({ url, title, text, labels, qr, code, onCopied, onShared, className, testIds }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async () => {
    const ok = await copyText(url);
    if (!ok) return;
    setCopied(true);
    onCopied?.();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await navigator.share({ url, title, text });
      onShared?.();
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <div className={cx('flex flex-col gap-3', className)}>
      {(qr || code) && (
        <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-4">
          {qr && <div className="[&_canvas]:size-44 [&_img]:size-44 [&_svg]:size-44" data-testid={testIds?.qr}>{qr}</div>}
          {code && <code className="select-all rounded-control bg-surface-2 px-3 py-1.5 font-mono text-title-2 tracking-[0.15em] text-ink">{code}</code>}
        </div>
      )}
      <div className={cx('grid gap-2', canShare ? 'grid-cols-2' : 'grid-cols-1')}>
        <Button variant="secondary" onClick={handleCopy} leadingIcon={copied ? <Check /> : <Copy />} aria-live="polite" data-testid={testIds?.copy}>
          {copied ? labels.copied : labels.copy}
        </Button>
        {canShare && (
          <Button variant="primary" onClick={handleShare} leadingIcon={<Share2 />} data-testid={testIds?.share}>
            {labels.share}
          </Button>
        )}
      </div>
    </div>
  );
}
