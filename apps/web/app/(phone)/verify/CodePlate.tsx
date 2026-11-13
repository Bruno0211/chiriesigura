'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import s from '../phone.module.css';
import { CopyIcon } from '../components/Icons';

type CopyState = 'idle' | 'copied' | 'selected';

/** The record's last line: the issued code in one-time-code cells, and the line to paste into each listing. */
export function CodePlate({ code, pasteLine }: { code: string; pasteLine: string }) {
  const [copy, setCopy] = useState<CopyState>('idle');
  const lineRef = useRef<HTMLParagraphElement>(null);
  const chars = code.replace(/^VC-/, '').split('');

  useEffect(() => {
    if (copy !== 'copied') return;
    const t = window.setTimeout(() => setCopy('idle'), 2500);
    return () => window.clearTimeout(t);
  }, [copy]);

  async function copyLine() {
    try {
      await navigator.clipboard.writeText(pasteLine);
      setCopy('copied');
    } catch {
      // Clipboard blocked: select the line so the system copy menu takes it.
      const line = lineRef.current;
      const selection = window.getSelection();
      if (line && selection) {
        const range = document.createRange();
        range.selectNodeContents(line);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setCopy('selected');
    }
  }

  return (
    <section className={s.plate} aria-labelledby="code-title">
      <div className={s.tab}>
        <h2 id="code-title">Your code</h2>
        <span>Public · goes in your listings</span>
      </div>
      <p className={s.cells}>
        <span className={s.srOnly}>{code}</span>
        <span className={s.prefix} aria-hidden="true">VC-</span>
        {chars.map((c, i) => (
          <span key={i} className={`${s.cell} ${s.cellIn}`} style={{ '--i': i } as CSSProperties} aria-hidden="true">
            {c}
          </span>
        ))}
      </p>
      <div className={s.paste}>
        <p className={s.label}>Paste this line into each listing</p>
        <p ref={lineRef} className={s.pasteLine}>{pasteLine}</p>
        <button type="button" className={s.secondary} onClick={copyLine}>
          <CopyIcon />
          {copy === 'copied' ? 'Copied' : 'Copy the line'}
        </button>
        <p className={copy === 'selected' ? s.note : s.srOnly} aria-live="polite">
          {copy === 'copied' && 'The line is copied.'}
          {copy === 'selected' && 'Copying was blocked, so the line is selected: copy it from the menu.'}
        </p>
      </div>
    </section>
  );
}
