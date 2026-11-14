'use client';

import s from '../phone.module.css';
import { SESSION_MS, countdown } from './flow';
import { useConnection, useSeconds } from './hooks';
import { ClockIcon } from './Icons';

interface Props {
  /** Right-hand label naming the page, when it has no stops to count. */
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

/** The header every phone page sits under: the line badge, the stop count, the connection and the session clock. */
export function FrameBar({ zone, step, sessionStartedAt }: Props) {
  const connection = useConnection();
  const nowSec = useSeconds(Boolean(sessionStartedAt));
  const left = sessionStartedAt && nowSec ? SESSION_MS - (nowSec * 1000 - sessionStartedAt) : null;

  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        <div className={s.headerTop}>
          <span className={s.brandMark} aria-hidden="true">VC</span>
          <span className={s.brand}>ChirieSigură</span>
          {step ? (
            <span className={s.where}>
              Stop {step.n} of {step.of}
            </span>
          ) : (
            zone && <span className={s.where}>{zone}</span>
          )}
        </div>
        <div className={s.headerMeta}>
          <p className={s.chip} data-connection={connection} role="status">
            <span className={s.dot} aria-hidden="true" />
            {CONNECTION_TEXT[connection]}
          </p>
          {left !== null && (
            <p className={`${s.chip} ${s.clock}`} data-low={left <= 60_000 || undefined}>
              <ClockIcon />
              <span className={s.srOnly}>Number check valid for </span>
              {left > 0 ? countdown(left) : 'expired'}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
