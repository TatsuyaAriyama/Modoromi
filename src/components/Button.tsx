import type { ButtonHTMLAttributes } from 'react';
import './ui.css';
import { tapLight } from '../lib/haptics';

type Variant = 'primary' | 'ghost' | 'accent' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  large?: boolean;
}

export function Button({
  variant = 'primary',
  block,
  large,
  className,
  onClick,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={`btn btn-${variant}${block ? ' btn-block' : ''}${
        large ? ' btn-lg' : ''
      }${className ? ' ' + className : ''}`}
      onClick={(e) => {
        void tapLight();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
