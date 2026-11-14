import { getDb } from '@/lib/db';
import { banPerson, dismissHold } from '@/lib/queries';
import { isReviewer } from '@/lib/review';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The team confirms a lifetime ban or dismisses a hold. */
export async function POST(req: Request) {
  if (!(await isReviewer())) return Response.json({ error: 'forbidden' }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { landlordId?: unknown; action?: unknown } | null;
  const { landlordId, action } = body ?? {};
  if (typeof landlordId !== 'string' || !UUID.test(landlordId) || (action !== 'ban' && action !== 'dismiss')) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const db = getDb();
  const found = action === 'ban' ? await banPerson(db, landlordId) : await dismissHold(db, landlordId);
  return found ? Response.json({ ok: true }) : Response.json({ error: 'not_found' }, { status: 404 });
}
