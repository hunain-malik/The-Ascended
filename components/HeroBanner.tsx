import { prisma } from '@/lib/db';

export default async function HeroBanner() {
  const hero = await prisma.media.findFirst({
    where: { isHero: true, hidden: false },
    select: { id: true, caption: true, kind: true },
  });
  if (!hero) return null;

  const isVideo = hero.kind === 'video' || hero.kind === 'animation';

  return (
    <section className="relative overflow-hidden rounded-3xl mx-4 sm:mx-8 mt-6 ring-1 ring-white/[0.06] shadow-2xl">
      <div className="relative aspect-[21/9] sm:aspect-[24/9] bg-ink-900">
        {isVideo ? (
          <video
            src={`/api/media/${hero.id}/file`}
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover scale-110 animate-[kenburns_30s_ease-in-out_infinite_alternate]"
          />
        ) : (
          <img
            src={`/api/media/${hero.id}/file`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 animate-[kenburns_30s_ease-in-out_infinite_alternate]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/70 via-transparent to-ink-950/30" />

        <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
          <p className="text-[10px] tracking-[0.4em] uppercase text-crimson-400/80 mb-2">
            featured · curated by you
          </p>
          <h2 className="heading-serif text-4xl sm:text-6xl text-bone-50 max-w-3xl drop-shadow-2xl">
            {hero.caption ?? 'Tonight, in the archive.'}
          </h2>
        </div>
      </div>
    </section>
  );
}
