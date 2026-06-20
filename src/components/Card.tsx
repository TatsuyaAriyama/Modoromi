import type { ReactNode } from 'react';
import './ui.css';

export function Card({
  children,
  tight,
  className,
  style,
}: {
  children: ReactNode;
  tight?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`card${tight ? ' card-pad-tight' : ''}${
        className ? ' ' + className : ''
      }`}
      style={style}
    >
      {children}
    </div>
  );
}
