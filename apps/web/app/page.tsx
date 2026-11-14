import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '48px 16px', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', lineHeight: 1.5 }}>
      <h1>ChirieSigură</h1>
      <p>Landlord verification for Romanian rental listings, checked by the mobile network: number, identity, SIM swap and location.</p>
      <ul>
        <li><Link href="/verify">Verify as a landlord</Link> (on your phone, mobile data)</li>
        <li><Link href="/check">Check a listing</Link> (students, when you can&apos;t use the extension)</li>
        <li><Link href="/privacy">What we store</Link></li>
        <li>Demo listings: <Link href="/demo/listing/d1">d1</Link> · <Link href="/demo/listing/d2">d2</Link> · <Link href="/demo/listing/d3">d3</Link> · <Link href="/demo/listing/d4">d4</Link> · <Link href="/demo/listing/d6">d6</Link></li>
      </ul>
    </main>
  );
}
