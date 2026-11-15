import { Auth0Client } from '@auth0/nextjs-auth0/server';

/** Student sign-in. Reads AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET and APP_BASE_URL. */
export const auth0 = new Auth0Client();

export const isSignedIn = async (): Promise<boolean> => !!(await auth0.getSession());

/** The signed-in student's Auth0 sub, or null. Hash it with accountHash before storing. */
export const signedInSub = async (): Promise<string | null> => (await auth0.getSession())?.user?.sub ?? null;
