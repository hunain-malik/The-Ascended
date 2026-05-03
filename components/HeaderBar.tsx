'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';

const tabs = [
  { id: 'all',       label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'photo',     label: 'Photos' },
  { id: 'video',     label: 'Videos' },
] as const;

export default function HeaderBar({
  user, total, favCount, vidCount, active, q,
}: {
  user: string;
  total: number;
  favCount: number;
  vidCount: number;
  active: string;
  q: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(q);

  function setFilter(id: string) {
    const sp = new URLSearchParams(params);
    if (id === 'all') sp.delete('filter'); else sp.set('filter', id);
    router.push(`/?${sp.toString()}`);
  }
  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(params);
    if (query) sp.set('q', query); else sp.delete('q');
    router.push(`/?${sp.toString()}`);
  }
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-950/70 border-b border-white/[0.06]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-5 flex items-center gap-4 flex-wrap">
        <Link href="/" className="group">
          <h1 className="heading-serif text-3xl sm:text-4xl text-bone-50 leading-none">
            The <span className="text-crimson-400 group-hover:text-crimson-500 transition">Ascended</span>
          </h1>
          <p className="text-[10px] tracking-[0.4em] uppercase text-bone-200/40 mt-1">
            {total} pieces · {favCount} favorites · {vidCount} motion
          </p>
        </Link>

        <nav className="ml-auto flex items-center gap-1 glass rounded-full p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={clsx(
                'px-4 py-1.5 text-sm rounded-full transition',
                active === t.id
                  ? 'bg-crimson-700/80 text-bone-50 shadow-inner'
                  : 'text-bone-200/70 hover:text-bone-50',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <form onSubmit={onSearch} className="flex items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search captions…"
            className="bg-black/30 border border-white/10 rounded-full px-4 py-2 text-sm
                       text-bone-50 placeholder:text-bone-200/30 outline-none
                       focus:border-crimson-500/60 w-44 focus:w-64 transition-[width]"
          />
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs text-bone-200/50 hidden sm:inline">{user}</span>
          <button onClick={logout} className="btn-ghost text-sm">Lock</button>
        </div>
      </div>
    </header>
  );
}
