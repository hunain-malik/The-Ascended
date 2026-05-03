'use client';

import clsx from 'clsx';

type Item = {
  id: string;
  kind: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  favorite: boolean;
};

export default function Lightbox({
  items, index, onClose, onNav, onToggleFav,
}: {
  items: Item[];
  index: number;
  onClose: () => void;
  onNav: (i: number) => void;
  onToggleFav: (id: string) => void;
}) {
  const item = items[index];
  const isVideo = item.kind === 'video' || item.kind === 'animation';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/90 backdrop-blur-2xl animate-fadeIn"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-5 right-5 btn-ghost text-sm"
      >
        Close · Esc
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onToggleFav(item.id); }}
        className={clsx(
          'absolute top-5 left-5 btn-ghost text-sm',
          item.favorite && 'text-crimson-400 border-crimson-500/40',
        )}
      >
        {item.favorite ? '♥ Favorited' : '♡ Favorite · F'}
      </button>

      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass grid place-items-center hover:border-crimson-500/40"
        >‹</button>
      )}
      {index < items.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNav(index + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass grid place-items-center hover:border-crimson-500/40"
        >›</button>
      )}

      <div className="max-w-[90vw] max-h-[88vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video
            key={item.id}
            src={`/api/media/${item.id}/file`}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-[82vh] rounded-lg shadow-2xl"
          />
        ) : (
          <img
            key={item.id}
            src={`/api/media/${item.id}/file`}
            alt={item.caption ?? ''}
            className="max-w-full max-h-[82vh] rounded-lg shadow-2xl object-contain"
          />
        )}
        {item.caption && (
          <p className="text-bone-200/70 text-sm text-center max-w-xl">{item.caption}</p>
        )}
        <p className="text-[10px] tracking-widest uppercase text-bone-200/30">
          {index + 1} / {items.length}
        </p>
      </div>
    </div>
  );
}
