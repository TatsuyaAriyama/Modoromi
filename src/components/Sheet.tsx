import { useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE =
  'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Modal bottom sheet: a real dialog, not a styled div. Moves focus in, traps
 * Tab inside, closes on Escape or a backdrop tap, and hands focus back to
 * whatever opened it.
 *
 * Rendered in place rather than through a portal, so the
 * `.screen > .sheet-backdrop` stagger exemption in index.css keeps matching.
 */
export function Sheet({
  titleId,
  onClose,
  children,
}: {
  /** id of the element naming this sheet, for aria-labelledby. */
  titleId?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(
        ref.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // The trigger may be gone (delete, wipe): only restore if it still exists.
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="sheet-backdrop" onClick={() => closeRef.current()}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
