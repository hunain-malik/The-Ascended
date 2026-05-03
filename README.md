# The Ascended

Private personal archive. Pulls media from a Telegram chat (default: Saved Messages)
into a sleek, password-gated gallery.

> **Private by design.** Only code lives on GitHub — no media, no secrets, no DB.
> The `.gitignore` blocks `/media`, `/data`, `*.session`, and `.env*`.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind
- SQLite via Prisma
- iron-session auth (single user, bcrypt'd password from env)
- gramjs (`telegram` npm package) for the Telegram client
- sharp for thumbnail generation

## First-time setup

```bash
# 1. install
npm install
npx prisma db push     # creates ./data/ascended.db

# 2. set your password
npm run set-password
# -> paste the printed lines into .env.local

# 3. get Telegram API creds
#    Visit https://my.telegram.org/auth -> "API development tools"
#    Add TG_API_ID and TG_API_HASH to .env.local

# 4. log in to Telegram once (interactive)
npm run sync:login
# -> paste the printed TG_SESSION value into .env.local
```

A starter `.env.local` (copy from `.env.example`):
```
AUTH_USERNAME=ascended
AUTH_PASSWORD_HASH=<from set-password>
SESSION_SECRET=<from set-password>
DATABASE_URL="file:./data/ascended.db"
MEDIA_DIR=./media
TG_API_ID=...
TG_API_HASH=...
TG_SESSION=<from sync:login>
TG_SOURCE=me
```

## Running

Two processes — keep both running:

```bash
# terminal 1: web app
npm run dev          # http://localhost:3000

# terminal 2: telegram sync (live + periodic backfill)
npm run sync
```

Open http://localhost:3000 → log in → enjoy.

## How sync works
- `TG_SOURCE=me` watches your Saved Messages.
  Set it to a username/chat id/`-100xxxx` channel id to pull from elsewhere.
- New media saved to that chat appears in the gallery within seconds.
- A periodic backfill (`TG_SYNC_INTERVAL`, default 60s) catches anything missed
  while the worker was offline.
- Each Telegram file is dedup'd by its `tgUniqueId` so re-runs are safe.

## Layout on disk
```
media/
  YYYY/MM/tg_<chat>_<msgid>.<ext>      # originals
  thumbs/YYYY/MM/...webp                # gallery thumbnails
data/ascended.db                        # sqlite metadata
```

## Keyboard shortcuts (in the lightbox)
- `←` / `→` — prev / next
- `F` — toggle favorite
- `Esc` — close

## Hardening notes
- Don't expose this to the public internet without TLS.
  For remote access from your phone, use Tailscale or Cloudflare Tunnel.
- `SESSION_SECRET` must be 32+ bytes of random; `set-password` generates it for you.
- Sessions are HTTP-only cookies, 30-day expiry. Hit "Lock" to clear.
- Rotate `TG_SESSION` if you ever suspect it leaked: revoke from Telegram → Settings → Devices.

## Switching to a remote/cloud setup later
- Swap SQLite for Postgres by changing `prisma/schema.prisma` provider + `DATABASE_URL`.
- Move `/media` to S3-compatible object storage (Bunny, R2). The `file` route
  becomes a presign instead of a stream.
- Keep auth + sync worker the same.
