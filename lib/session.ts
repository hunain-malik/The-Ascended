import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export type SessionData = {
  user?: { username: string };
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? 'dev-only-insecure-secret-change-me-now-please-32+chars',
  cookieName: 'ascended_session',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session.user) throw new Response('Unauthorized', { status: 401 });
  return session.user;
}
