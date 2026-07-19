import type { DataFault } from '../../data/repositories';
import { useT } from '../../i18n/useT';

/**
 * Says out loud that a stored file could not be read. The alternative is what
 * the app used to do — show an empty history and let the next write make the
 * emptiness permanent — so the honest, low-key notice is the whole point.
 */
export function DataFaultNotice({ faults }: { faults: DataFault[] }) {
  const t = useT();
  if (faults.length === 0) return null;

  return (
    <div className="banner" role="status">
      <strong style={{ fontWeight: 500 }}>{t('data.faultTitle')}</strong>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {faults.map((f) => (
          <li key={f.key}>
            {f.reason === 'partial'
              ? t('data.faultPartial', { count: f.dropped })
              : t(f.key === 'sessions' ? 'data.faultSessions' : 'data.faultAlarms')}
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 6 }}>{t('data.faultKept')}</p>
    </div>
  );
}
