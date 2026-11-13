'use client';

import s from '../phone.module.css';
import { SESSION_MS, countdown } from './flow';
import { useConnection, useSeconds } from './hooks';
import { ClockIcon } from './Icons';

interface Props {
  /** Right-hand label naming the zone the visitor is in. */
  zone?: string;
  step?: { n: number; of: number };
  /** When the operator confirmed the number (ms epoch); starts the 15-minute session clock. */
  sessionStartedAt?: number | null;
}

const CONNECTION_TEXT = {
  cellular: 'On mobile data',
  wifi: "You're on Wi-Fi: switch to mobile data",
  unknown: 'Use mobile data, not Wi-Fi',
} as const;

/** The secure-zone frame every phone page sits under: product, zone, connection, step and session clock. */
export function FrameBar({ zone = 'Secure verification', step, sessionStartedAt }: Props) {
  const connection = useConnection();
  const nowSec = useSeconds(Boolean(sessionStartedAt));
  const left = sessionStartedAt && nowSec ? SESSION_MS - (nowSec * 1000 - sessionStartedAt) : null;

  return (
    <header className={s.frame}>
      <div className={s.frameInner}>
        <div className={s.frameTop}>
          <span className={s.brand}>ChirieSigură</span>
          <span className={s.zone}>{zone}</span>
        </div>
        <div className={s.frameMeta}>
          <p className={s.chip} data-connection={connection} role="status">
            <span className={s.dot} aria-hidden="true" />
            {CONNECTION_TEXT[connection]}
          </p>
          <p className={s.frameNums}>
            {left !== null && (
              <span className={left <= 60_000 ? `${s.clock} ${s.clockLow}` : s.clock}>
                <ClockIcon />
                <span className={s.srOnly}>Number check valid for </span>
                {left > 0 ? countdown(left) : 'expired'}
              </span>
            )}
            {step && (
              <span>
                <span className={s.srOnly}>Step </span>
                {step.n}
                <span aria-hidden="true"> / </span>
                <span className={s.srOnly}> of </span>
                {step.of}
              </span>
            )}
          </p>
        </div>
      </div>
    </header>
  );
}
