import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function query(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(QUERY).matches
  );
}

/**
 * True when the OS asks for reduced motion. Reactive — updates if the user
 * flips the setting while the app is open. JS-driven motion (the wind-down
 * breathing orb) reads this to hold still; CSS animations are already quieted
 * by a global `prefers-reduced-motion` media query.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(query);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
