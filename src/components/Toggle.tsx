import './ui.css';
import { tapLight } from '../lib/haptics';

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      className="toggle"
      data-on={on}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        void tapLight();
        onChange(!on);
      }}
    />
  );
}
