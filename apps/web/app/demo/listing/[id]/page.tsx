/* eslint-disable @next/next/no-img-element -- remote stock photos, no image optimisation needed for a demo page */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEMO_LISTINGS, SIMILAR } from '@/lib/demo-listings';
import s from './listing.module.css';

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return Object.keys(DEMO_LISTINGS).map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const l = DEMO_LISTINGS[(await params).id];
  return { title: l ? `${l.title} · Anunțuri Timiș` : 'Anunțuri Timiș' };
}

export default async function DemoListingPage({ params }: { params: Params }) {
  const { id } = await params;
  const l = DEMO_LISTINGS[id];
  if (!l) notFound();
  const others = Object.values(DEMO_LISTINGS).filter((o) => o.id !== id && o.title !== l.title);

  return (
    <div className={s.page} lang="ro">
      <header className={s.header}>
        <span className={s.logo}>Anunțuri Timiș</span>
        <span className={s.demo}>Pagină demo · nu este un anunț real</span>
      </header>
      <main className={s.main}>
        <nav className={s.crumbs}>Imobiliare › Apartamente de închiriat › {l.area}</nav>
        <div className={s.grid}>
          <section>
            <div className={s.gallery}>
              {l.photos.map((src, i) => (
                <img key={src} src={src} alt={`Fotografie ${i + 1}: ${l.title}`} className={i === 0 ? s.hero : s.thumb} />
              ))}
            </div>
            <h1 className={s.title} data-testid="title">{l.title}</h1>
            <p className={s.meta}><span data-testid="place">{l.area}</span> · {l.rooms}</p>
            <h2 className={s.h2}>Descriere</h2>
            <div className={s.description} data-testid="description">
              {l.description.map((p) => <p key={p}>{p}</p>)}
            </div>
            <p className={s.posted}>{l.posted} · ID anunț: {l.id}</p>
          </section>
          <aside className={s.side}>
            <p className={s.price} data-testid="price">{l.price}</p>
            <div className={s.contact}>
              <p className={s.contactName}>{l.contactName} · persoană fizică</p>
              <p className={s.phone} data-testid="phone">{l.phone}</p>
              <button type="button" className={s.message}>Trimite mesaj</button>
            </div>
          </aside>
        </div>
        <section className={s.similar} data-testid="similar">
          <h2 className={s.h2}>Anunțuri similare</h2>
          <div className={s.cards}>
            <article className={s.card}>
              <h3>{SIMILAR.title}</h3>
              <p className={s.cardPrice}>{SIMILAR.price}</p>
              <p className={s.cardLine}>{SIMILAR.line}</p>
            </article>
            {others.map((o) => (
              <Link key={o.id} href={`/demo/listing/${o.id}`} className={s.card}>
                <h3>{o.title}</h3>
                <p className={s.cardPrice}>{o.price}</p>
                <p className={s.cardLine}>{o.area}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
