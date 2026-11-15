import { auth0 } from './auth0';

/** The signed-in team reviewer's lowercased email (verified and listed in REVIEW_EMAILS, comma-separated, any case), or null. */
export async function reviewerEmail(): Promise<string | null> {
  const user = (await auth0.getSession())?.user;
  if (!user?.email || user.email_verified !== true) return null;
  const email = String(user.email).toLowerCase();
  const allowed = (process.env.REVIEW_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email) ? email : null;
}

export async function isReviewer(): Promise<boolean> {
  return !!(await reviewerEmail());
}
