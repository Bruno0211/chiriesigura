import type { ReviewAction, ReviewRequest } from '@cs/shared';
import { decideCase } from '@/lib/cases';
import { getDb } from '@/lib/db';
import { reviewerEmail } from '@/lib/review';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS: readonly ReviewAction[] = ['dismiss', 'false_report', 'uphold', 'ban'];

/** The team decides one report's case: dismiss, mark it false, confirm the warning, or ban the person. */
export async function POST(req: Request) {
  const reviewer = await reviewerEmail();
  if (!reviewer) return Response.json({ error: 'forbidden' }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { [K in keyof ReviewRequest]?: unknown } | null;
  const { caseId, action } = body ?? {};
  if (typeof caseId !== 'string' || !UUID.test(caseId) || !ACTIONS.includes(action as ReviewAction)) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const result = await decideCase(getDb(), caseId, action as ReviewAction, reviewer);
  if (result === 'ok') return Response.json({ ok: true });
  if (result === 'not_found') return Response.json({ error: 'not_found' }, { status: 404 });
  return Response.json({ error: result }, { status: 409 });
}
