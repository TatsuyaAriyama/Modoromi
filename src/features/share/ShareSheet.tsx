import { useEffect, useId, useMemo, useState } from 'react';
import './share.css';
import { useStore } from '../../app/store';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Toggle } from '../../components/Toggle';
import { buildShareCard } from '../../domain/shareCard';
import { isoToHm } from '../../domain/format';
import type { SleepSession, UserSettings } from '../../domain/types';
import { formatDate, formatDuration } from '../../i18n/catalog';
import { formatHm } from '../../i18n/clock';
import { useClock, useLang, useT } from '../../i18n/useT';
import { renderCardPng } from '../../lib/shareCanvas';
import { chooseRoute, performShare, shareCaps } from '../../lib/shareImage';
import { tapLight } from '../../lib/haptics';

/**
 * The share sheet. The preview is an <img> of the exported PNG rather than the
 * canvas itself, for two reasons: what the user sees is byte-identical to what
 * they will send (a second renderer could drift, and here that would be a
 * privacy bug, not a cosmetic one), and long-press-to-save works on an <img>
 * and never on a <canvas> — which is the only dependency-free save path left
 * inside a WebView with no share sheet.
 */
export function ShareSheet({
  session,
  onClose,
}: {
  session: SleepSession;
  onClose: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const clock = useClock();
  const titleId = useId();
  const settings = useStore((s) => s.settings);
  const saveSettings = useStore((s) => s.saveSettings);

  /**
   * Read the LIVE settings at call time. Spreading the render-time `settings`
   * would make two toggles tapped in the same tick clobber each other — the
   * second save would carry the first's stale value.
   */
  const setShare = (patch: Partial<UserSettings>) =>
    void saveSettings({ ...useStore.getState().settings, ...patch });

  /**
   * One state cell holding the finished render AND the model it came from.
   * Keying it this way means a stale render is simply ignored rather than
   * cleared by a synchronous setState at the top of the effect, which React
   * 19 flags as a cascading render.
   */
  const [render, setRender] = useState<{
    key: object;
    file: File | null;
    url: string | null;
  } | null>(null);

  const showTimes = settings.shareShowTimes ?? false;
  const showTheme = settings.shareShowTheme ?? false;

  const model = useMemo(
    () =>
      buildShareCard(
        session,
        {
          date: formatDate(new Date(session.endedAt), lang),
          duration: formatDuration(session.durationMin, lang),
          bedHm: formatHm(isoToHm(session.startedAt), clock),
          wakeHm: formatHm(isoToHm(session.endedAt), clock),
        },
        { showTimes, showTheme },
      ),
    [session, lang, clock, showTimes, showTheme],
  );

  const txt = useMemo(
    () => ({ kicker: t('share.card.kicker'), tagline: t('share.card.tagline') }),
    [t],
  );
  const caption = t('share.caption', {
    date: model.dateLabel,
    dur: model.durationLabel,
  });
  const alt = t('share.aria', {
    date: model.dateLabel,
    dur: model.durationLabel,
  });

  // Re-render whenever the model changes — flipping a toggle must repaint.
  useEffect(() => {
    let live = true;
    void renderCardPng(model, txt).then((blob) => {
      if (!live) return;
      const f = blob
        ? new File([blob], 'madoromi.png', { type: 'image/png' })
        : null;
      setRender({ key: model, file: f, url: f ? URL.createObjectURL(f) : null });
    });
    return () => {
      live = false;
    };
  }, [model, txt]);

  // Only a render that belongs to the CURRENT model may be shown or shared.
  const fresh = render && render.key === model ? render : null;
  const file = fresh?.file ?? null;
  const url = fresh?.url ?? null;
  const status: 'rendering' | 'ready' | 'failed' = !fresh
    ? 'rendering'
    : fresh.file
      ? 'ready'
      : 'failed';

  // Revoke each object URL once it is superseded or the sheet closes. Cleanup
  // only — no state is written here.
  useEffect(() => {
    const u = render?.url;
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [render]);

  const route = chooseRoute(shareCaps(file));

  // The file is already rendered here: iOS drops the user-activation token
  // across a long await, and share() would then reject silently.
  const onShare = () => {
    void tapLight();
    void performShare(route, file, caption);
  };

  return (
    <Sheet titleId={titleId} onClose={onClose}>
      <>
        <div className="spread">
          <h2 style={{ fontSize: 18 }} id={titleId}>
            {t('share.title')}
          </h2>
          <button className="back-btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        {url ? (
          <img className="share-preview" src={url} alt={alt} />
        ) : (
          <p className="muted share-placeholder" role="status">
            {status === 'failed' ? t('share.failed') : t('share.preparing')}
          </p>
        )}

        <div className="set-row">
          <span className="set-label">{t('share.showTimes')}</span>
          <Toggle
            on={showTimes}
            label={t('share.showTimes')}
            onChange={(v) => setShare({ shareShowTimes: v })}
          />
        </div>

        {session.theme?.trim() ? (
          <div className="set-row">
            <span className="set-label">{t('share.showTheme')}</span>
            <Toggle
              on={showTheme}
              label={t('share.showTheme')}
              onChange={(v) => setShare({ shareShowTheme: v })}
            />
          </div>
        ) : null}

        <p className="muted share-note">{t('share.privacyNote')}</p>
        {route === 'longpress' && status === 'ready' ? (
          <p className="muted share-note">{t('share.longPress')}</p>
        ) : null}

        {route !== 'longpress' ? (
          <Button block large disabled={status !== 'ready'} onClick={onShare}>
            {status === 'ready' ? t('share.action') : t('share.preparing')}
          </Button>
        ) : null}
      </>
    </Sheet>
  );
}
