import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { MEDIA_DIR, contentTypeFor, safeJoin } from '@/lib/media';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const m = await prisma.media.findUnique({ where: { id } });
  if (!m) return new Response('Not found', { status: 404 });

  const abs = safeJoin(MEDIA_DIR, m.filePath);
  let stat;
  try { stat = statSync(abs); } catch { return new Response('Missing file', { status: 410 }); }

  const range = req.headers.get('range');
  const type = m.mime ?? contentTypeFor(abs);

  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      const stream = createReadStream(abs, { start, end });
      return new Response(Readable.toWeb(stream) as any, {
        status: 206,
        headers: {
          'Content-Type': type,
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }
  }

  const stream = createReadStream(abs);
  return new Response(Readable.toWeb(stream) as any, {
    headers: {
      'Content-Type': type,
      'Content-Length': String(stat.size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="${path.basename(abs)}"`,
    },
  });
}
