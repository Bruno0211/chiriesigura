import { Figtree } from 'next/font/google';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChatIcon, HeartIcon, LogoMark, PlusIcon, SearchIcon, UserIcon } from './icons';
import s from './demo.module.css';

// latin-ext carries Romanian ă â î ș ț.
const sans = Figtree({ subsets: ['latin', 'latin-ext'], variable: '--font-demo', display: 'swap' });

/** "Anunțuri Timiș": the fictional classifieds portal the extension badges during the demo. Not a real site. */
export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${s.site} ${sans.variable}`} lang="ro">
      <p className={s.demoStrip}>Pagină demo · anunțurile de pe acest site nu sunt reale</p>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/demo" className={s.logo} aria-label="Anunțuri Timiș, pagina principală">
            <LogoMark />
            <span className={s.logoWord} aria-hidden="true">
              anunțuri <b>timiș</b>
            </span>
          </Link>
          <form className={s.headerSearch} action="/demo" role="search">
            <label className={s.sr} htmlFor="header-q">
              Caută în anunțuri
            </label>
            <SearchIcon />
            <input id="header-q" name="q" type="search" placeholder="Caută apartamente, garsoniere, zone…" className={s.headerInput} />
            <button type="submit" className={s.headerGo}>
              Caută
            </button>
          </form>
          <nav className={s.headerNav} aria-label="Contul tău">
            <Link href="/demo" className={s.headerItem} aria-label="Favorite">
              <HeartIcon />
              <span className={s.headerLabel}>Favorite</span>
            </Link>
            <Link href="/demo" className={s.headerItem} aria-label="Mesaje">
              <ChatIcon />
              <span className={s.headerLabel}>Mesaje</span>
            </Link>
            <Link href="/demo" className={s.headerItem} aria-label="Contul meu">
              <UserIcon />
              <span className={s.headerLabel}>Contul meu</span>
            </Link>
          </nav>
          <Link href="/demo" className={s.post}>
            <PlusIcon />
            Adaugă anunț
          </Link>
        </div>
      </header>
      {/* Popular searches: every link is a real filter on the results page. */}
      <nav className={s.catBar} aria-label="Căutări populare">
        <div className={s.catInner}>
          <Link href="/demo">Toate anunțurile</Link>
          <Link href="/demo?tip=apartament">Apartamente</Link>
          <Link href="/demo?tip=garsoniera">Garsoniere</Link>
          <Link href="/demo?oras=timisoara">Timișoara</Link>
          <Link href="/demo?oras=lugoj">Lugoj</Link>
          <Link href="/demo?pret=300">Sub 300 €</Link>
          <Link href="/demo?q=student">Pentru studenți</Link>
        </div>
      </nav>
      {children}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <span className={s.footerLogo}>
            <LogoMark />
            <span>
              anunțuri <b>timiș</b>
            </span>
          </span>
          <p className={s.footerNote}>
            Un portal de anunțuri fictiv, construit pentru demonstrația ChirieSigură la UniHack. Anunțurile, numele și numerele de telefon nu sunt reale.
          </p>
        </div>
      </footer>
    </div>
  );
}
