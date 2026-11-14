import { REPORT_OK_TEXT } from '@cs/shared';
import s from '../phone.module.css';
import { CheckIcon } from './Icons';

const NBSP = ' ';
/** Joins a phrase's words with no-break spaces, so "1 didn't show up" never splits across lines. */
const keep = (t: string) => t.replace(/ /g, NBSP);

/**
 * A viewing-report line with the drawn check beside the "all good" words: no colour emoji, the words carry the meaning.
 * Each phrase ("4 verified viewings:", "3 ✓ all good", "1 didn't show up") is held together with no-break spaces, so the
 * line wraps only between phrases. Text nodes stay direct children of the parent (no wrapping spans), so the line still
 * reads, and matches, as one string.
 */
export function ReportLine({ line }: { line: string }) {
  const at = line.indexOf(': ');
  const text =
    at === -1 ? line : `${keep(line.slice(0, at + 1))} ${line.slice(at + 2).split(' · ').map(keep).join(' · ')}`;
  const [first, ...rest] = text.split(keep(REPORT_OK_TEXT));
  return (
    <>
      {first}
      {rest.flatMap((part, i) => [
        <CheckIcon key={i} className={`${s.okMark} ${s.okMarkInLine}`} />,
        NBSP + keep(REPORT_OK_TEXT) + part,
      ])}
    </>
  );
}
