'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import GlowHeading from '@/components/GlowHeading';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Wrong credentials');
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen grid place-items-center px-6 overflow-hidden">
      <AmbientBackdrop intensity={1.1} />
      <div className="w-full max-w-md animate-fadeIn relative">
        <div className="text-center mb-10">
          <h1 className="heading-serif text-6xl text-bone-50 leading-none">
            <GlowHeading>The</GlowHeading>{' '}
            <GlowHeading className="text-crimson-400">Ascended</GlowHeading>
          </h1>
          <p className="mt-4 text-bone-200/70 tracking-[0.4em] uppercase text-[10px]">
            private &nbsp;·&nbsp; sanctum
          </p>
        </div>

        <form onSubmit={onSubmit} className="glass rounded-2xl p-8 space-y-5 shadow-2xl">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-bone-200/60">Name</label>
            <input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3
                         text-bone-50 placeholder:text-bone-200/30 outline-none
                         focus:border-crimson-500/60 focus:ring-2 focus:ring-crimson-700/30"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-bone-200/60">Key</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3
                         text-bone-50 outline-none
                         focus:border-crimson-500/60 focus:ring-2 focus:ring-crimson-700/30"
            />
          </div>

          {error && (
            <p className="text-sm text-crimson-400 animate-fadeIn">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Opening…' : 'Enter'}
          </button>
        </form>

        <p className="mt-8 text-center text-[11px] tracking-widest uppercase text-bone-200/30">
          authorized eyes only
        </p>
      </div>
    </main>
  );
}
