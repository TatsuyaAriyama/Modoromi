import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Bottom-sheet dialog with the accessibility plumbing every sheet needs:
 * backdrop tap and Escape both close, focus moves into the sheet on open and
 * is trapped there (Tab cycles) until it closes. Visuals come from the
 * existing .sheet-backdrop / .sheet classes.
 */
export function Sheet({
  onClose,
  label,
  children,
}: {
  onClose: () => void;
  /** Accessible name for the dialog. */
  label?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Move focus into the dialog on open, restore it on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus();
  }, []);

  const focusables = (): HTMLElement[] =>
    Array.from(
      ref.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((el) => !el.hasAttribute('disabled'));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;
    if (e.shiftKey && (current === first || current === ref.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
