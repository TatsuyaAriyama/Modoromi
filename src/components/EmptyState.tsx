import type { ReactNode } from 'react';
import './ui.css';
import { EyeMark } from './EyeMark';

/**
 * A quiet empty state: the closed-eye mark, a headline, and a one-line hint
 * that points at the first step — so a blank screen still shows the way.
 */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <EyeMark size={44} color="var(--text-mute)" />
      <p className="empty-state-title">{title}</p>
      {hint && <p className="empty-state-hint">{hint}</p>}
      {action}
    </div>
  );
}
