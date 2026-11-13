import type { CheckStep, CheckStepName } from '@cs/shared';
import type { CSSProperties, ReactNode } from 'react';
import s from '../phone.module.css';
import { CHECK_COPY, CHECK_ORDER } from './flow';
import { CheckIcon, CrossIcon, PendingIcon } from './Icons';

type RowState = 'ok' | 'fail' | 'checking' | 'waiting';

const STATE_WORD: Record<RowState, string> = { ok: 'Passed', fail: 'Failed', checking: 'Checking', waiting: 'Waiting' };
const STATE_ICON: Record<RowState, ReactNode> = {
  ok: <CheckIcon />,
  fail: <CrossIcon />,
  checking: <PendingIcon />,
  waiting: <PendingIcon />,
};

interface Props {
  /** Results from the API, shown with their message verbatim. */
  steps: CheckStep[];
  /** Checks whose request is in flight. */
  pending?: CheckStepName[];
  /** Checks that haven't started yet. */
  waiting?: CheckStepName[];
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
}

/** The confirmation record: one ruled line per check, posted with its result, time and state. */
export function StepList({
  steps,
  pending = [],
  waiting = [],
  times = {},
  details = {},
  labels = {},
  title = 'Confirmation record',
  by = 'By your mobile operator',
  footer,
  compact = false,
}: Props) {
  const result = new Map(steps.map((st) => [st.name, st]));
  const rows = CHECK_ORDER.filter((n) => result.has(n) || pending.includes(n) || waiting.includes(n));
  let posted = 0;

  return (
    <section className={s.module} aria-labelledby="record-title">
      <div className={s.tab}>
        <h2 id="record-title">{title}</h2>
        <span>{by}</span>
      </div>
      <ol className={s.rows} aria-labelledby="record-title" aria-live="polite">
        {rows.map((name, i) => {
          const r = result.get(name);
          const state: RowState = r ? (r.ok ? 'ok' : 'fail') : pending.includes(name) ? 'checking' : 'waiting';
          const style = r ? ({ '--i': posted++ } as CSSProperties) : undefined;
          const meta = [times[name], details[name]].filter(Boolean).join(' · ');
          return (
            <li key={`${name}:${state}`} className={r ? `${s.row} ${s.posted}` : s.row} data-state={state} style={style}>
              <span className={s.idx}>{String(i + 1).padStart(2, '0')}</span>
              <div className={s.rowBody}>
                <p className={s.what}>{labels[name] ?? CHECK_COPY[name].label}</p>
                {r && !compact && <p className={s.msg}>{r.message}</p>}
                {meta && <p className={s.meta}>{meta}</p>}
              </div>
              <span className={s.state} data-state={state}>
                {STATE_ICON[state]}
                {STATE_WORD[state]}
              </span>
            </li>
          );
        })}
      </ol>
      {footer && <div className={s.foot}>{footer}</div>}
    </section>
  );
}
