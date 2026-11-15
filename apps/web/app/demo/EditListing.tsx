'use client';

import { useId, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import s from './demo.module.css';

type Problem = 'limits' | 'failed';

const PROBLEM: Record<Problem, string> = {
  limits: 'Descrierea poate avea cel mult 2000 de caractere și 20 de rânduri.',
  failed: 'Nu am putut salva. Încearcă din nou.',
};

/** The listing text, one paragraph per line. The extension reads the pasted code from this element only. */
export function Description({ lines }: { lines: string[] }) {
  return (
    <div className={s.description} data-testid="description">
      {lines.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

const noSubscribe = () => () => {};
/** `?edit=1`: the landlord came from the link on /verify to paste the code line. */
const linkedToEdit = () => new URLSearchParams(window.location.search).get('edit') === '1';

/** Focus the editor with the caret after the text, where the code line goes. */
function focusAtEnd(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.focus();
  el.setSelectionRange(el.value.length, el.value.length);
}

/** "Editează anunțul": the landlord changes the description in place, as on a real portal. */
export function EditListing({ listingId, initial }: { listingId: string; initial: string[] }) {
  const [lines, setLines] = useState(initial);
  // Null until the landlord opens or closes the editor; until then `?edit=1` decides.
  const [open, setOpen] = useState<boolean | null>(null);
  const linked = useSyncExternalStore(noSubscribe, linkedToEdit, () => false);
  const editing = open ?? linked;
  const [draft, setDraft] = useState(() => initial.join('\n'));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saved, setSaved] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const id = useId();

  function startEditing() {
    setDraft(lines.join('\n'));
    setProblem(null);
    setSaved(false);
    setOpen(true);
  }

  function close() {
    setProblem(null);
    flushSync(() => setOpen(false));
    editButton.current?.focus();
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    try {
      const res = await fetch(`/api/demo/listings/${encodeURIComponent(listingId)}/description`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: draft }),
      });
      if (res.status !== 200) {
        setProblem(res.status === 400 ? 'limits' : 'failed');
        return;
      }
      setLines(((await res.json()) as { description: string[] }).description);
      setSaved(true);
      close();
    } catch {
      setProblem('failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {editing ? (
        <form className={s.editor} onSubmit={save} noValidate>
          {/* The panel heading above already reads "Descriere". */}
          <label htmlFor={id} className={s.sr}>
            Descriere
          </label>
          <textarea
            id={id}
            ref={focusAtEnd}
            className={s.editArea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            aria-invalid={problem === 'limits' || undefined}
            aria-describedby={problem ? `${id}-problem` : undefined}
          />
          {problem && (
            <p id={`${id}-problem`} className={s.editProblem} role="alert">
              {PROBLEM[problem]}
            </p>
          )}
          <div className={s.editActions}>
            <button type="submit" className={s.primary} disabled={saving} aria-busy={saving || undefined}>
              Salvează
            </button>
            <button type="button" className={s.secondary} onClick={close}>
              Renunță
            </button>
          </div>
        </form>
      ) : (
        <>
          <Description lines={lines} />
          <button ref={editButton} type="button" className={`${s.secondary} ${s.editButton}`} onClick={startEditing}>
            Editează anunțul
          </button>
        </>
      )}
      <p className={s.editSaved} role="status">
        {saved ? 'Anunțul a fost actualizat.' : ''}
      </p>
    </>
  );
}
