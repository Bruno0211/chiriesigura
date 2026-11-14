import type { CheckStep, CheckStepName } from '@cs/shared';
import type { CSSProperties, ReactNode } from 'react';
import s from '../phone.module.css';
import { CHECK_COPY, CHECK_ORDER } from './flow';
import { CheckIcon, CrossIcon } from './Icons';

type RowState = 'ok' | 'fail' | 'checking' | 'waiting' | 'skipped';
/** What the line does after a stop: travelled, travelling, still ahead, broken by a failure, on into the sign, or ends. */
type Segment = 'done' | 'moving' | 'ahead' | 'broken' | 'into' | 'none';

const STATE_WORD: Record<RowState, string> = {
  ok: 'Passed',
  fail: 'Failed',
  checking: 'Checking',
  waiting: 'Waiting',
  skipped: 'Not checked',
};
const DISC_ICON: Partial<Record<RowState, ReactNode>> = { ok: <CheckIcon />, fail: <CrossIcon /> };

interface Props {
  /** Results from the API, shown with their message verbatim. */
  steps: CheckStep[];
  /** Checks whose request is in flight. */
  pending?: CheckStepName[];
  /** Checks that haven't started yet. */
  waiting?: CheckStepName[];
  /** Checks the ride never reached because an earlier one failed: kept on the broken line, unlit. */
  notReached?: CheckStepName[];
  /** Local time each result arrived, e.g. "14:31:07". */
  times?: Partial<Record<CheckStepName, string>>;
  /** Extra masked detail per check, e.g. "+40 7•• ••• 001". */
  details?: Partial<Record<CheckStepName, string>>;
  labels?: Partial<Record<CheckStepName, string>>;
  title?: string;
  by?: string;
  footer?: ReactNode;
  /** Hide the per-check messages: a summary of a finished record. */
  compact?: boolean;
  /** The route's last stop, e.g. "Your code": grey until reached, broken after a failure. */
  terminus?: string;
  /** The line runs on past the last stop into the destination sign placed right after the record. */
  continues?: boolean;
}

/** The record as a line diagram: one stop per check, lit with its result as the operator answers. */
export function StepList({
  steps,
  pending = [],
  waiting = [],
  notReached = [],
  times = {},
  details = {},
  labels = {},
  title = 'Your checks',
  by = 'By your operator',
  footer,
  compact = false,
  terminus,
  continues = false,
}: Props) {
  const result = new Map(steps.map((st) => [st.name, st]));
  const rows = CHECK_ORDER.filter(
    (n) => result.has(n) || pending.includes(n) || waiting.includes(n) || notReached.includes(n),
  );
  const states = rows.map<RowState>((n) => {
    const r = result.get(n);
    if (r) return r.ok ? 'ok' : 'fail';
    return pending.includes(n) ? 'checking' : notReached.includes(n) ? 'skipped' : 'waiting';
  });
  const failedAt = states.indexOf('fail');
  const broken = failedAt !== -1;

  const segment = (i: number): Segment => {
    if (i === rows.length - 1) return continues ? 'into' : !terminus ? 'none' : broken ? 'broken' : 'ahead';
    if (broken && i >= failedAt) return 'broken';
    const next = states[i + 1];
    return next === 'ok' || next === 'fail' ? 'done' : next === 'checking' ? 'moving' : 'ahead';
  };
  let posted = 0;

  return (
    <section className={s.record} aria-labelledby="record-title">
      <div className={s.recordHead}>
        <h2 id="record-title">{title}</h2>
        <span>{by}</span>
      </div>
      <ol className={s.route} aria-labelledby="record-title" aria-live="polite">
        {rows.map((name, i) => {
          const r = result.get(name);
          const state = states[i]!;
          const label = labels[name] ?? CHECK_COPY[name].label;
          const disc = (
            <span className={s.disc} aria-hidden="true">
              {DISC_ICON[state]}
            </span>
          );
          if (compact) {
            // A finished record: one line per stop, so the sign below it stays in the first screen.
            return (
              <li key={`${name}:${state}`} className={`${s.stop} ${s.stopCompact}`} data-state={state} data-seg={segment(i)}>
                {disc}
                <div className={s.stopHead}>
                  <p className={s.what}>{label}</p>
                  {times[name] && <span className={s.time}>{times[name]}</span>}
                </div>
                <span className={s.srOnly}>{STATE_WORD[state]}</span>
              </li>
            );
          }
          const style = r ? ({ '--i': posted++ } as CSSProperties) : undefined;
          const meta = [times[name], details[name]].filter(Boolean).join(' · ');
          return (
            <li
              key={`${name}:${state}`}
              className={r ? `${s.stop} ${s.lit}` : s.stop}
              data-state={state}
              data-seg={segment(i)}
              style={style}
            >
              {disc}
              <div className={s.stopHead}>
                <p className={s.what}>{label}</p>
                {/* Never reached: the unlit stop says so to screen readers; sighted readers see the broken line. */}
                <span className={state === 'skipped' ? s.srOnly : s.word} data-state={state}>
                  {STATE_WORD[state]}
                </span>
              </div>
              {r && <p className={s.msg}>{r.message}</p>}
              {meta && <p className={s.meta}>{meta}</p>}
            </li>
          );
        })}
      </ol>
      {terminus && (
        <div className={s.terminus} data-state={broken ? 'broken' : 'ahead'}>
          <span className={s.terminusMark} aria-hidden="true" />
          <p>{terminus}</p>
        </div>
      )}
      {footer && <p className={s.recordFoot}>{footer}</p>}
    </section>
  );
}
