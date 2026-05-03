import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getSession } from '@/lib/session';

const Body = z.object({ username: z.string().min(1), password: z.string().min(1) });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const { username, password } = parsed.data;

  const expectedUser = process.env.AUTH_USERNAME;
  const expectedHash = process.env.AUTH_PASSWORD_HASH;
  if (!expectedUser || !expectedHash) {
    return NextResponse.json(
      { error: 'Server not configured. Set AUTH_USERNAME and AUTH_PASSWORD_HASH.' },
      { status: 500 },
    );
  }

  // Constant-ish-time compare: always run bcrypt to avoid revealing username existence.
  const userOk = username === expectedUser;
  const passOk = await bcrypt.compare(password, expectedHash);
  if (!userOk || !passOk) {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
    return NextResponse.json({ error: 'Wrong credentials' }, { status: 401 });
  }

  const session = await getSession();
  session.user = { username };
  await session.save();
  return NextResponse.json({ ok: true });
}
