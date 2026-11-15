import { getDb } from '@/lib/db';
import { EDITABLE_DEMO_LISTINGS, normaliseDescription, saveDescription } from '@/lib/demo-edits';
import { DEMO_LISTINGS } from '@/lib/demo-listings';

/** The landlord replaces an editable demo listing's description: no sign-in, it is a demo page (design 2026-11-15). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!Object.hasOwn(DEMO_LISTINGS, id)) return Response.json({ error: 'not_found' }, { status: 404 });
  if (!EDITABLE_DEMO_LISTINGS.includes(id)) return Response.json({ error: 'not_editable' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { description?: unknown } | null;
  const lines = typeof body?.description === 'string' ? normaliseDescription(body.description) : null;
  if (!lines) return Response.json({ error: 'bad_request' }, { status: 400 });

  await saveDescription(getDb(), id, lines);
  return Response.json({ description: lines });
}
