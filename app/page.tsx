import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import Gallery from '@/components/Gallery';
import HeaderBar from '@/components/HeaderBar';
import HeroBanner from '@/components/HeroBanner';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import GlowHeading from '@/components/GlowHeading';

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
        <EmptyState filter={sp.filter} q={sp.q} />
      ) : (
        <>
          {!sp.filter && !sp.q && <HeroBanner />}
          <div className="px-4 pb-24 sm:px-8">
            <Gallery key={`${sp.filter ?? 'all'}|${sp.q ?? ''}`} items={items} />
          </div>
        </>
      )}
    </main>
  );
}

function EmptyState({ filter, q }: { filter?: string; q?: string }) {
  const filtered = !!filter || !!q;
  return (
    <div className="relative grid place-items-center min-h-[70vh] text-center px-6 animate-fadeIn overflow-hidden">
      <AmbientBackdrop intensity={0.9} />
      <div className="relative">
        <h2 className="heading-serif text-6xl text-bone-50 leading-none">
          <GlowHeading>{filtered ? 'Nothing here yet.' : 'Nothing yet.'}</GlowHeading>
        </h2>
        <p className="mt-6 text-bone-200/60 max-w-md mx-auto tracking-wide">
          {filtered
            ? 'Nothing matches this filter — try another tab or clear the search.'
            : 'The vault is empty. Run the sync — content lands here within seconds.'}
        </p>
        {!filtered && (
          <pre className="mt-8 inline-block glass px-5 py-3 rounded-full text-xs text-bone-100/80 tracking-widest">
            npm&nbsp;run&nbsp;sync
          </pre>
        )}
      </div>
    </div>
  );
}
