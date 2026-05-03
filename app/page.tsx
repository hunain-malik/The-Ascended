import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import Gallery from '@/components/Gallery';
import HeaderBar from '@/components/HeaderBar';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session.user) redirect('/login');
  const sp = await searchParams;

  const where: any = { hidden: false };
  if (sp.filter === 'favorites') where.favorite = true;
  if (sp.filter === 'video') where.kind = { in: ['video', 'animation'] };
  if (sp.filter === 'photo') where.kind = 'photo';
  if (sp.q) where.caption = { contains: sp.q };

  const [items, total, favCount, vidCount] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { takenAt: 'desc' },
      take: 200,
      select: {
        id: true, kind: true, width: true, height: true, duration: true,
        caption: true, favorite: true, takenAt: true,
      },
    }),
    prisma.media.count({ where: { hidden: false } }),
    prisma.media.count({ where: { hidden: false, favorite: true } }),
    prisma.media.count({ where: { hidden: false, kind: { in: ['video', 'animation'] } } }),
  ]);

  return (
    <main className="min-h-screen">
      <HeaderBar
        user={session.user.username}
        total={total}
        favCount={favCount}
        vidCount={vidCount}
        active={sp.filter ?? 'all'}
        q={sp.q ?? ''}
      />

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="px-4 pb-24 sm:px-8">
          <Gallery items={items} />
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center min-h-[60vh] text-center px-6 animate-fadeIn">
      <div>
        <h2 className="heading-serif text-5xl text-bone-50">Nothing yet.</h2>
        <p className="mt-4 text-bone-200/60 max-w-md mx-auto">
          The vault is empty. Run the Telegram sync to begin pulling from
          Saved Messages.
        </p>
        <pre className="mt-6 inline-block glass px-4 py-2 rounded-lg text-xs text-bone-100/70">
          npm run sync
        </pre>
      </div>
    </div>
  );
}
