'use client';

import { useEffect, useState, useCallback } from 'react';
import clsx from 'clsx';
import Lightbox from './Lightbox';

type Item = {
  id: string;
  kind: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  caption: string | null;
  favorite: boolean;
  takenAt: Date | null;
};

export default function Gallery({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const onToggleFav = useCallback(async (id: string) => {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, favorite: !m.favorite } : m)));
    await fetch(`/api/media/${id}/favorite`, { method: 'POST' });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (openIdx === null) return;
      if (e.key === 'Escape') setOpenIdx(null);
      if (e.key === 'ArrowRight') setOpenIdx((i) => (i === null ? null : Math.min(items.length - 1, i + 1)));
      if (e.key === 'ArrowLeft')  setOpenIdx((i) => (i === null ? null : Math.max(0, i - 1)));
      if (e.key.toLowerCase() === 'f') onToggleFav(items[openIdx].id);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIdx, items, onToggleFav]);

  return (
    <>
      <div className="masonry mt-8 max-w-screen-2xl mx-auto">
        {items.map((m, i) => (
          <Tile key={m.id} item={m} onOpen={() => setOpenIdx(i)} onToggleFav={() => onToggleFav(m.id)} />
        ))}
      </div>

      {openIdx !== null && (
        <Lightbox
          items={items}
          index={openIdx}
          onClose={() => setOpenIdx(null)}
          onNav={(i) => setOpenIdx(i)}
          onToggleFav={onToggleFav}
        />
      )}
    </>
  );
}

function Tile({ item, onOpen, onToggleFav }: { item: Item; onOpen: () => void; onToggleFav: () => void }) {
  const aspect =
    item.width && item.height ? `${item.width} / ${item.height}` : '3 / 4';
  const isVideo = item.kind === 'video' || item.kind === 'animation';

  return (
    <div className="group relative animate-fadeIn">
      <button
        onClick={onOpen}
        className="block w-full overflow-hidden rounded-xl bg-ink-800
                   ring-1 ring-white/[0.04] transition
                   hover:ring-crimson-500/40 hover:shadow-[0_25px_60px_-20px_rgba(185,28,28,0.5)]"
        style={{ aspectRatio: aspect }}
      >
        <img
          loading="lazy"
          src={`/api/media/${item.id}/thumb`}
          alt={item.caption ?? ''}
          className="w-full h-full object-cover transition duration-700 group-hover:scale-[1.04]"
        />
        {isVideo && (
          <span className="absolute top-3 left-3 text-[10px] tracking-widest uppercase
                           bg-black/60 backdrop-blur px-2 py-1 rounded-full text-bone-100/80">
            {item.duration ? `${Math.round(item.duration)}s` : 'video'}
          </span>
        )}
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        className={clsx(
          'absolute top-3 right-3 w-9 h-9 rounded-full grid place-items-center transition',
          'bg-black/40 backdrop-blur border border-white/10 hover:border-crimson-500/60',
          item.favorite ? 'text-crimson-400' : 'text-bone-100/60 opacity-0 group-hover:opacity-100',
        )}
        aria-label="Favorite"
      >
        <Heart filled={item.favorite} />
      </button>

      {item.caption && (
        <p className="mt-2 text-xs text-bone-200/50 line-clamp-2 px-1">{item.caption}</p>
      )}
    </div>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7.5-4.6-9.5-9.2C1 8 3.5 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4c4 0 6.5 4 5 7.8C19.5 16.4 12 21 12 21z" strokeLinejoin="round" />
    </svg>
  );
}
