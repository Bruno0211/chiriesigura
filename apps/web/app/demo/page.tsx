/* eslint-disable @next/next/no-img-element -- remote stock photos, no image optimisation needed for a demo page */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { DEMO_LISTINGS, type DemoListing } from '@/lib/demo-listings';
import { countLabel, facts, fold, pricePerSquareMeter, priceValue, propertyType, roomCount, sized, sortListings, SORTS, splitPrice, type SortKey } from './format';
import { CameraIcon, ChevronIcon, FactIcon, PinIcon, PlusIcon, SearchIcon } from './icons';
import { SafetyTips } from './SafetyTips';
import { SaveButton } from './SaveButton';
import s from './demo.module.css';

export const metadata: Metadata = { title: 'Apartamente de închiriat în Timiș · Anunțuri Timiș' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
interface Filters {
  q: string;
  tip: string;
  sort: string;
  oras: string;
  pret: string;
  camere: string;
}

const CITIES: Record<string, string> = { timisoara: 'Timișoara', lugoj: 'Lugoj' };
const PRICES = ['300', '400', '500', '600'];

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? '';

/** The search really filters: by town, top price, rooms and every keyword (diacritics optional). */
function matches(l: DemoListing, f: Filters): boolean {
  // A Timiș portal: "Tot județul Timiș" means its towns. A flat elsewhere (d7, Cluj) is reached only by its own link.
  const town = fold(l.area).split(',')[0]!.trim();
  if (f.oras ? town !== f.oras : !(town in CITIES)) return false;
  if (f.tip && fold(propertyType(l.title)) !== f.tip) return false;
  if (f.pret && priceValue(l.price) > Number(f.pret)) return false;
  if (f.camere) {
    const n = roomCount(l.rooms);
    if (f.camere === '3' ? n < 3 : n !== Number(f.camere)) return false;
  }
  const text = fold([l.title, l.area, l.rooms, ...l.description, ...l.amenities].join(' '));
  return fold(f.q)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}

/** The same filters with another sort order; the default order keeps the URL clean. */
function hrefWith(f: Filters, sort: SortKey): string {
  const params = new URLSearchParams();
  for (const key of ['q', 'tip', 'oras', 'pret', 'camere'] as const) if (f[key]) params.set(key, f[key]);
  if (sort !== 'noi') params.set('sort', sort);
  const query = params.toString();
  return query ? `/demo?${query}` : '/demo';
}

export default function DemoResultsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className={s.wrap}>
      <nav className={s.crumbs} aria-label="Unde te afli">
        <Link href="/demo">Acasă</Link>
        <ChevronIcon />
        <Link href="/demo">Imobiliare</Link>
        <ChevronIcon />
        <span aria-current="page">Apartamente de închiriat</span>
      </nav>
      {/* searchParams are request data: under Cache Components they are read inside <Suspense>. */}
      <Suspense fallback={<ResultsFallback />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const p = await searchParams;
  const f: Filters = {
    q: one(p.q).trim(),
    tip: one(p.tip),
    sort: one(p.sort),
    oras: one(p.oras),
    pret: one(p.pret),
    camere: one(p.camere),
  };
  const listings = sortListings(Object.values(DEMO_LISTINGS).filter((l) => matches(l, f)), f.sort);
  const filtered = Boolean(f.q || f.tip || f.oras || f.pret || f.camere);
  const sort: SortKey = SORTS.some((o) => o.key === f.sort) ? (f.sort as SortKey) : 'noi';

  return (
    <>
      <h1 className={s.pageTitle}>{f.tip === 'garsoniera' ? 'Garsoniere' : 'Apartamente'} de închiriat în {CITIES[f.oras] ?? 'Timiș'}</h1>

      <form className={s.search} action="/demo" role="search" aria-label="Filtrează anunțurile">
        <label className={`${s.searchField} ${s.searchWide}`}>
          <span className={s.searchLabel}>Cuvinte cheie</span>
          <input className={s.searchControl} type="search" name="q" defaultValue={f.q} placeholder="ex. mobilat, Centru, studenți" />
        </label>
        <label className={s.searchField}>
          <span className={s.searchLabel}>Tip proprietate</span>
          <select className={`${s.searchControl} ${s.select}`} name="tip" defaultValue={f.tip}>
            <option value="">Oricare</option>
            <option value="apartament">Apartament</option>
            <option value="garsoniera">Garsonieră</option>
          </select>
        </label>
        <label className={s.searchField}>
          <span className={s.searchLabel}>Localitate</span>
          <select className={`${s.searchControl} ${s.select}`} name="oras" defaultValue={f.oras}>
            <option value="">Tot județul Timiș</option>
            <option value="timisoara">Timișoara</option>
            <option value="lugoj">Lugoj</option>
          </select>
        </label>
        <label className={s.searchField}>
          <span className={s.searchLabel}>Preț maxim</span>
          <select className={`${s.searchControl} ${s.select}`} name="pret" defaultValue={f.pret}>
            <option value="">Orice preț</option>
            {PRICES.map((v) => (
              <option key={v} value={v}>
                Până la {v} €
              </option>
            ))}
          </select>
        </label>
        <label className={s.searchField}>
          <span className={s.searchLabel}>Camere</span>
          <select className={`${s.searchControl} ${s.select}`} name="camere" defaultValue={f.camere}>
            <option value="">Oricâte</option>
            <option value="1">1 cameră</option>
            <option value="2">2 camere</option>
            <option value="3">3+ camere</option>
          </select>
        </label>
        {sort !== 'noi' && <input type="hidden" name="sort" value={sort} />}
        <button type="submit" className={`${s.primary} ${s.searchSubmit}`}>
          <SearchIcon />
          Caută
        </button>
      </form>

      <div className={s.results}>
        <section aria-labelledby="results-count">
          <div className={s.resultsBar}>
            <div className={s.resultsLead}>
              <h2 id="results-count" className={s.resultsCount}>
                {countLabel(listings.length)}
              </h2>
              {filtered && (
                <Link href="/demo" className={s.textLink}>
                  Șterge filtrele
                </Link>
              )}
            </div>
            <nav className={s.sortLinks} aria-label="Sortează anunțurile">
              <span>Sortează:</span>
              {SORTS.map((o) => (
                <Link key={o.key} href={hrefWith(f, o.key)} aria-current={o.key === sort ? 'true' : undefined}>
                  {o.label}
                </Link>
              ))}
            </nav>
          </div>
          {listings.length === 0 ? (
            <div className={s.empty}>
              <h3 className={s.emptyTitle}>Niciun anunț nu se potrivește</h3>
              <p>Încearcă un preț mai mare sau altă localitate.</p>
              <Link href="/demo" className={s.secondary}>
                Vezi toate anunțurile
              </Link>
            </div>
          ) : (
            <ol className={s.cardList}>
              {listings.map((l, i) => (
                <li key={l.id}>
                  <ListingCard l={l} eager={i < 2} />
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className={s.rail}>
          <SafetyTips />
          <section className={s.promo} aria-labelledby="promo-title">
            <h2 id="promo-title" className={s.promoTitle}>
              Ai un apartament de închiriat?
            </h2>
            <p className={s.promoText}>Publică-l în câteva minute și primește mesaje de la chiriași din Timiș.</p>
            <Link href="/demo" className={s.primary}>
              <PlusIcon />
              Adaugă anunț
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}

function ResultsFallback() {
  return (
    <>
      <h1 className={s.pageTitle}>Apartamente de închiriat în Timiș</h1>
      <p className={s.sr} role="status">
        Se încarcă anunțurile…
      </p>
      <div className={s.skeletonSearch} aria-hidden="true" />
      <div className={s.skeletonList} aria-hidden="true">
        <div />
        <div />
        <div />
      </div>
    </>
  );
}

function ListingCard({ l, eager }: { l: DemoListing; eager: boolean }) {
  const { amount, per } = splitPrice(l.price);
  const ppm = pricePerSquareMeter(l.price, l.rooms);
  return (
    <article className={s.card}>
      <div className={s.cardMedia}>
        <img src={sized(l.photos[0]!, 640)} alt="" loading={eager ? 'eager' : 'lazy'} />
        <span className={s.photoCount}>
          <CameraIcon />
          {l.photos.length}
          <span className={s.sr}> fotografii</span>
        </span>
        <SaveButton className={s.cardSave} />
      </div>
      <div className={s.cardBody}>
        <div className={s.cardTop}>
          <h3 className={s.cardTitle}>
            <Link href={`/demo/listing/${l.id}`}>{l.title}</Link>
          </h3>
          <p className={s.cardPrice}>
            {amount}
            <span className={s.per}>{per}</span>
            {ppm && <span className={s.cardPpm}>{ppm}</span>}
          </p>
        </div>
        <p className={s.cardArea}>
          <PinIcon />
          {l.area}
        </p>
        <ul className={s.factRow} aria-label="Pe scurt">
          {facts(l.rooms).map((x) => (
            <li key={x.text}>
              <FactIcon kind={x.kind} />
              {x.text}
            </li>
          ))}
        </ul>
        <p className={s.excerpt}>{l.description[0]}</p>
        <p className={s.cardFoot}>
          <span>{l.posted}</span>
          <span>Persoană fizică</span>
        </p>
      </div>
    </article>
  );
}
