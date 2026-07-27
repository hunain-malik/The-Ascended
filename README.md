# The Ascended

Private personal archive. Pulls media from **Telegram** (default: Saved Messages) and
**Google Drive** into a single sleek, password-gated gallery.

> **Private by design.** Only code lives on GitHub — no media, no secrets, no DB.
> The `.gitignore` blocks `/media`, `/data`, `*.session`, and `.env*`.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind
- SQLite via Prisma
- iron-session auth (single user, bcrypt'd password from env)
- gramjs (`telegram` npm package) for the Telegram client
- googleapis for Drive
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

Up to three processes — keep them running:

```bash
# terminal 1: web app
npm run dev          # http://localhost:3000

# terminal 2: telegram sync (live + periodic backfill)
npm run sync

# terminal 3 (optional): google drive sync
npm run sync:drive
```

Open http://localhost:3000 → log in → enjoy.

## Deploying (the real site, not an instructions page)

> **Why the GitHub Pages URL shows the README:** GitHub Pages only serves
> static files — it runs the repo through Jekyll and renders `README.md` as
> the homepage. It physically cannot run this app (Node server, login API,
> SQLite, private media). Turn it off in **Settings → Pages → Source: None**
> and deploy with one of the options below instead. Once deployed, visiting
> the site lands on `/login`, and logging in is what unlocks the gallery —
> exactly like local dev.

The repo ships a production `Dockerfile` that runs the web app **and**
auto-starts the Telegram/Drive sync workers whenever their credentials are
present. All private state (db, media, secrets) lives under a single
`/app/storage` volume.

### Option A — any box with Docker (VPS, home server)

```bash
cp .env.local <deploy-dir>/   # same file as dev; escaped hash works as-is
docker compose up -d --build
# db + media + secrets appear under ./storage (gitignored)
```

Then put it behind TLS (Caddy, Cloudflare Tunnel, or Tailscale for
private-only access). The session cookie is `Secure` in production, so
login **requires HTTPS** — plain `http://` on a LAN will silently refuse
to keep you logged in.

### Option B — Fly.io (managed, has persistent volumes)

```bash
fly launch --no-deploy                          # uses the included fly.toml
fly volumes create ascended_storage --size 10
fly secrets set AUTH_USERNAME=ascended \
  AUTH_PASSWORD_HASH='$2a$12$...' \             # RAW hash in single quotes —
  SESSION_SECRET=... \                          # \$-escaping is ONLY for .env files
  TG_API_ID=... TG_API_HASH=... TG_SESSION='...'
fly deploy
```

For Drive sync, upload the OAuth files into the volume once:
`fly ssh sftp shell` → put `google-credentials.json` and
`google-token.json` into `/app/storage/secrets/`, then `fly apps restart`.

Railway / Render work the same way: point them at the repo, they pick up the
`Dockerfile`; attach a persistent volume at `/app/storage` and set the same
env vars (raw, unescaped values).

### Getting the credentials for a remote deploy

Run these locally, then copy the values into your host's secrets:

```bash
npm run set-password   # -> AUTH_PASSWORD_HASH + SESSION_SECRET
npm run sync:login     # -> TG_SESSION (interactive, needs your phone)
npm run drive:login    # -> secrets/google-token.json (optional)
```

Media synced before deploying can be seeded by copying your local `media/`
and `prisma/data/ascended.db` into the volume — or just let the workers
re-sync from scratch on the server.

## Google Drive setup (optional)

```bash
# 1. console.cloud.google.com -> New project
# 2. Enable "Google Drive API"
# 3. OAuth consent screen -> External, Testing, add your gmail as test user
# 4. Credentials -> Create OAuth client ID -> Desktop app -> download JSON
# 5. Save as ./secrets/google-credentials.json
# 6. Right-click the Drive folder you want to pull from -> "Share with anyone with the link"
#    is NOT needed; ownership is enough. Copy the folder URL.
#    The ID is the part after /folders/ -> set as DRIVE_FOLDER_ID in .env.local

npm run drive:login   # paste the auth code from the redirect URL
npm run sync:drive    # backfills the folder, then live-tracks new files
```

The Drive worker filters to image/* and video/* mime types. Folders nest recursively.
Drive items appear in the same gallery alongside Telegram items.

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
  YYYY/MM/tg_<chat>_<msgid>.<ext>          # telegram originals
  drive/YYYY/MM/gd_<file-id>.<ext>          # drive originals
  thumbs/...webp                            # gallery thumbnails (mirrors structure)
data/ascended.db                            # sqlite metadata
secrets/google-credentials.json             # OAuth client (gitignored)
secrets/google-token.json                   # OAuth refresh token (gitignored)
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
