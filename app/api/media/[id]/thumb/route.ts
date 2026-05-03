import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { MEDIA_DIR, safeJoin } from '@/lib/media';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const m = await prisma.media.findUnique({ where: { id } });
  if (!m) return new Response('Not found', { status: 404 });

  const rel = m.thumbPath ?? m.filePath;
  const abs = safeJoin(MEDIA_DIR, rel);
  let stat;
  try { stat = statSync(abs); } catch { return new Response('Missing thumb', { status: 410 }); }

  return new Response(Readable.toWeb(createReadStream(abs)) as any, {
    headers: {
      'Content-Type': m.thumbPath ? 'image/webp' : (m.mime ?? 'application/octet-stream'),
      'Content-Length': String(stat.size),
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
