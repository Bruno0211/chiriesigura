'use client';

import { useEffect, useState } from 'react';
import { ChatIcon, CheckIcon, ShareIcon } from './icons';
import s from './demo.module.css';

type ShareState = 'idle' | 'copied' | 'failed';

/** "Distribuie": copies the listing's link and says so. */
export function ShareButton() {
  const [state, setState] = useState<ShareState>('idle');

  useEffect(() => {
    if (state !== 'copied') return;
    const t = window.setTimeout(() => setState('idle'), 2200);
    return () => window.clearTimeout(t);
  }, [state]);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <>
      <button
        type="button"
        className={s.iconButton}
        onClick={share}
        aria-label={state === 'copied' ? 'Link copiat' : 'Distribuie anunțul'}
        title={state === 'failed' ? 'Copiază linkul din bara de adrese' : 'Distribuie anunțul'}
      >
        {state === 'copied' ? <CheckIcon /> : <ShareIcon />}
      </button>
      <span className={s.sr} role="status">
        {state === 'copied' && 'Linkul anunțului a fost copiat.'}
        {state === 'failed' && 'Copierea a fost blocată: copiază linkul din bara de adrese.'}
      </span>
    </>
  );
}

/** "Trimite mesaj" says plainly that this demo portal sends nothing, instead of failing silently. */
export function MessageButton() {
  const [tried, setTried] = useState(false);
  return (
    <>
      <button type="button" className={`${s.primary} ${s.block}`} onClick={() => setTried(true)}>
        <ChatIcon />
        Trimite mesaj
      </button>
      <p className={s.actionNote} role="status">
        {tried ? 'Mesajele sunt dezactivate pe acest site demo.' : ''}
      </p>
    </>
  );
}
