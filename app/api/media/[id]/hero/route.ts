import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const m = await prisma.media.findUnique({ where: { id }, select: { isHero: true } });
  if (!m) return new Response('Not found', { status: 404 });

  // Toggle: if already hero, unset; otherwise set this one (and unset all others)
  if (m.isHero) {
    await prisma.media.update({ where: { id }, data: { isHero: false } });
    return NextResponse.json({ isHero: false });
  }

  await prisma.$transaction([
    prisma.media.updateMany({ where: { isHero: true }, data: { isHero: false } }),
    prisma.media.update({ where: { id }, data: { isHero: true } }),
  ]);
  return NextResponse.json({ isHero: true });
}
