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
  const m = await prisma.media.findUnique({ where: { id }, select: { favorite: true } });
  if (!m) return new Response('Not found', { status: 404 });

  const updated = await prisma.media.update({
    where: { id },
    data: { favorite: !m.favorite },
    select: { favorite: true },
  });
  return NextResponse.json(updated);
}
