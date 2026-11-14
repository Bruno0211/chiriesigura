'use client';

import { useState } from 'react';
import { HeartIcon } from './icons';
import s from './demo.module.css';

/** "Salvează": the heart every listings portal has. Saving is local to the page; the demo stores nothing. */
export function SaveButton({ variant = 'icon', className = '' }: { variant?: 'icon' | 'label'; className?: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      className={`${variant === 'icon' ? s.saveIcon : s.saveLabel} ${className}`}
      aria-pressed={saved}
      aria-label={variant === 'icon' ? 'Salvează anunțul' : undefined}
      onClick={() => setSaved((v) => !v)}
    >
      <HeartIcon />
      {variant === 'label' && (saved ? 'Salvat' : 'Salvează')}
    </button>
  );
}
