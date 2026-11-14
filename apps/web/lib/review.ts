import { auth0 } from './auth0';

/** Team reviewers: a verified email listed in REVIEW_EMAILS (comma-separated, any case). */
export async function isReviewer(): Promise<boolean> {
  const user = (await auth0.getSession())?.user;
  if (!user?.email || user.email_verified !== true) return false;
  const allowed = (process.env.REVIEW_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(String(user.email).toLowerCase());
}
