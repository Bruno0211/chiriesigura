/* eslint-disable @next/next/no-img-element -- remote stock photos, no image optimisation needed for a demo page */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEMO_LISTINGS, SIMILAR } from '@/lib/demo-listings';
import { facts, pricePerSquareMeter, propertyType, sized, splitPrice, type FactKind } from '../../format';
import { CameraIcon, CheckIcon, ChevronIcon, ClockIcon, FactIcon, PhoneIcon, PinIcon } from '../../icons';
import { MessageButton, ShareButton } from '../../ListingActions';
import { SafetyTips } from '../../SafetyTips';
import { SaveButton } from '../../SaveButton';
import s from '../../demo.module.css';

type Params = Promise<{ id: string }>;

// Every listing is prerendered from generateStaticParams, and an unknown id must stay a real 404, so the page
// reads params at the top instead of streaming behind <Suspense>. That makes this segment block by design.
export const instant = false;

export function generateStaticParams() {
  return Object.keys(DEMO_LISTINGS).map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const l = DEMO_LISTINGS[(await params).id];
  return { title: l ? `${l.title} · Anunțuri Timiș` : 'Anunțuri Timiș' };
}

const SPEC_LABEL: Record<FactKind, string> = { rooms: 'Camere', area: 'Suprafață utilă', floor: 'Etaj' };

/** "etaj 2/4" reads "2/4" under the "Etaj" label; "parter" reads "Parter". */
const specValue = (kind: FactKind, text: string): string =>
  kind === 'floor' ? text.replace(/^etaj\s*/i, '').replace(/^parter$/i, 'Parter') : text;

/** OpenStreetMap's own embed around the flat, with its marker on the listing's coordinates. */
function mapUrl({ lat, lng }: { lat: number; lng: number }): string {
  const bbox = [lng - 0.012, lat - 0.006, lng + 0.012, lat + 0.006].map((n) => n.toFixed(4)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export default async function DemoListingPage({ params }: { params: Params }) {
  const { id } = await params;
  const l = DEMO_LISTINGS[id];
  if (!l) notFound();
  // A copy of this listing never shows as "similar": the student has to spot it on their own. Copies of other
  // listings collapse to the first one too, so the strip never shows two identical cards side by side.
  const seen = new Set([l.title]);
  const others = Object.values(DEMO_LISTINGS)
    .filter((o) => !seen.has(o.title) && seen.add(o.title))
    .slice(0, 3);
  const { amount, per } = splitPrice(l.price);
  const ppm = pricePerSquareMeter(l.price, l.rooms);
  const f = facts(l.rooms);
  const shown = l.photos.slice(0, 3);
  const tel = l.phone.replace(/[^\d+]/g, '');

  return (
    <main className={s.wrap}>
      <nav className={s.crumbs} aria-label="Unde te afli">
        <Link href="/demo">Acasă</Link>
        <ChevronIcon />
        <Link href="/demo">Apartamente de închiriat</Link>
        <ChevronIcon />
        <span aria-current="page">{l.area}</span>
      </nav>

      <div className={s.listingTop}>
        <section className={s.gallery} data-count={shown.length} aria-label={`Fotografii: ${l.title}`}>
          {/* Each photo opens full size in a new tab; the count chip opens the first one. */}
          {shown.map((src, i) => (
            <a key={src} href={src} target="_blank" rel="noreferrer" className={i === 0 ? s.galleryHero : s.galleryThumb}>
              <img src={i === 0 ? src : sized(src, 700)} alt={`Fotografia ${i + 1} din ${l.photos.length}: ${l.title}`} />
            </a>
          ))}
          <a href={l.photos[0]} target="_blank" rel="noreferrer" className={s.galleryCount}>
            <CameraIcon />
            {l.photos.length} fotografii
          </a>
        </section>

        <aside className={s.summary} aria-label="Preț și contact">
          <div className={s.summaryHead}>
            <p className={s.posted}>
              <ClockIcon />
              {l.posted}
            </p>
            <div className={s.summaryActions}>
              <ShareButton />
              <SaveButton variant="label" />
            </div>
          </div>
          <h1 className={s.title} data-testid="title">
            {l.title}
          </h1>
          <p className={s.area}>
            <PinIcon />
            {/* The extension reads where the listing says the flat is from this element. */}
            <span data-testid="place">{l.area}</span>
          </p>
          <p className={s.price} data-testid="price">
            {amount}
            <span className={s.per}>{per}</span>
          </p>
          {ppm && <p className={s.ppm}>{ppm}</p>}
          <ul className={s.factRow} aria-label="Pe scurt">
            {f.map((x) => (
              <li key={x.text}>
                <FactIcon kind={x.kind} />
                {x.text}
              </li>
            ))}
          </ul>
          <div className={s.owner}>
            <div className={s.ownerHead}>
              <span className={s.avatar} aria-hidden="true">
                {l.contactName.charAt(0)}
              </span>
              <div>
                <p className={s.ownerName}>{l.contactName}</p>
                <p className={s.ownerKind}>Persoană fizică</p>
              </div>
            </div>
            <p className={s.phoneRow}>
              <PhoneIcon />
              <a href={`tel:${tel}`} className={s.phone} data-testid="phone">
                {l.phone}
              </a>
            </p>
            <MessageButton />
          </div>
        </aside>
      </div>

      <div className={s.listingBody}>
        <div className={s.stack}>
          <section className={s.panel} aria-labelledby="desc-title">
            <h2 id="desc-title" className={s.h2}>
              Descriere
            </h2>
            <div className={s.description} data-testid="description">
              {l.description.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>

          <section className={s.panel} aria-labelledby="specs-title">
            <h2 id="specs-title" className={s.h2}>
              Detalii
            </h2>
            <dl className={s.specs}>
              <div className={s.spec}>
                <dt>Tip proprietate</dt>
                <dd>{propertyType(l.title)}</dd>
              </div>
              {f.map((x) => (
                <div key={x.kind} className={s.spec}>
                  <dt>{SPEC_LABEL[x.kind]}</dt>
                  <dd>{specValue(x.kind, x.text)}</dd>
                </div>
              ))}
            </dl>
            <h3 className={s.h3}>Facilități</h3>
            <ul className={s.amenities}>
              {l.amenities.map((a) => (
                <li key={a}>
                  <CheckIcon />
                  {a}
                </li>
              ))}
            </ul>
          </section>

          <section className={s.panel} aria-labelledby="map-title">
            <h2 id="map-title" className={s.h2}>
              Localizare
            </h2>
            <p className={s.mapArea}>
              <PinIcon />
              {l.area}
            </p>
            <div className={s.map}>
              <iframe src={mapUrl(l.coords)} title={`Harta zonei: ${l.area}`} loading="lazy" />
            </div>
            <p className={s.mapNote}>Locația afișată este aproximativă.</p>
          </section>

          <p className={s.adMeta}>ID anunț: {l.id}</p>
        </div>

        <aside className={s.rail}>
          <SafetyTips />
        </aside>
      </div>

      <section className={s.similar} data-testid="similar" aria-labelledby="similar-title">
        <h2 id="similar-title" className={s.h2}>
          Anunțuri similare
        </h2>
        <ul className={s.similarGrid}>
          <li>
            <article className={s.mini}>
              <div className={s.miniMedia}>
                <img src={sized(SIMILAR.photo, 520)} alt="" loading="lazy" />
              </div>
              <div className={s.miniBody}>
                <h3 className={s.miniTitle}>{SIMILAR.title}</h3>
                <p className={s.miniPrice}>{SIMILAR.price}</p>
                <p className={s.miniLine}>{SIMILAR.line}</p>
              </div>
            </article>
          </li>
          {others.map((o) => (
            <li key={o.id}>
              <article className={s.mini}>
                <div className={s.miniMedia}>
                  <img src={sized(o.photos[0]!, 520)} alt="" loading="lazy" />
                </div>
                <div className={s.miniBody}>
                  <h3 className={s.miniTitle}>
                    <Link href={`/demo/listing/${o.id}`}>{o.title}</Link>
                  </h3>
                  <p className={s.miniPrice}>{o.price}</p>
                  <p className={s.miniLine}>{o.area}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
