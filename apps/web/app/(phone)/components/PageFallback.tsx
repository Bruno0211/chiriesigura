import s from '../phone.module.css';
import { FrameBar } from './FrameBar';

/** What the server sends before a browser-only flow takes over: the frame and a quiet placeholder. */
export function PageFallback({ zone }: { zone?: string }) {
  return (
    <>
      <FrameBar zone={zone} />
      <main className={s.main} aria-busy="true">
        <div className={s.skeleton} />
        <div className={s.skeletonBlock} />
        <p className={s.srOnly}>Loading the secure page…</p>
      </main>
    </>
  );
}
