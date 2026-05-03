#!/usr/bin/env tsx
/**
 * Long-running Google Drive sync worker.
 *  - Backfills photos/videos from DRIVE_FOLDER_ID (recursive)
 *  - Uses Drive's changes API to incrementally pick up new/edited files
 *
 * Run: npm run sync:drive
 */
import 'dotenv/config';
import path from 'node:path';
import { promises as fs, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';
import { google, drive_v3 } from 'googleapis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR ?? './media');
const FOLDER_IDS = (process.env.DRIVE_FOLDER_ID || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const INTERVAL  = Number(process.env.DRIVE_SYNC_INTERVAL ?? 120) * 1000;
const CRED_PATH  = path.resolve(process.env.GOOGLE_CREDENTIALS_PATH ?? './secrets/google-credentials.json');
const TOKEN_PATH = path.resolve(process.env.GOOGLE_TOKEN_PATH       ?? './secrets/google-token.json');

async function ensureDir(p: string) { await fs.mkdir(p, { recursive: true }); }

async function authedDrive(): Promise<drive_v3.Drive> {
  const creds = JSON.parse(await fs.readFile(CRED_PATH, 'utf8'));
  const tokens = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf8'));
  const c = creds.installed ?? creds.web;
  const oauth2 = new google.auth.OAuth2(c.client_id, c.client_secret, c.redirect_uris?.[0]);
  oauth2.setCredentials(tokens);
  return google.drive({ version: 'v3', auth: oauth2 });
}

function isMedia(mime?: string | null): 'photo' | 'video' | 'animation' | null {
  if (!mime) return null;
  if (mime.startsWith('image/')) return mime === 'image/gif' ? 'animation' : 'photo';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

function extFor(mime: string, fallback = 'bin') {
  const m: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic',
    'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/x-m4v': 'm4v',
  };
  return m[mime] ?? fallback;
}

function ymdPath(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return path.join(`${y}`, `${m}`);
}

async function makeThumb(srcAbs: string, kind: string, dstAbs: string): Promise<boolean> {
  if (kind !== 'photo' && kind !== 'animation') return false;
  try {
    await sharp(srcAbs).rotate().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dstAbs);
    return true;
  } catch (e) {
    console.warn('thumb failed', e instanceof Error ? e.message : e);
    return false;
  }
}

async function importFile(drive: drive_v3.Drive, file: drive_v3.Schema$File, parentPath = '') {
  const kind = isMedia(file.mimeType);
  if (!kind || !file.id || !file.mimeType) return;

  const exists = await prisma.media.findUnique({ where: { driveFileId: file.id } });
  if (exists) return;

  const taken = new Date(file.createdTime ?? Date.now());
  const subdir = path.join('drive', ymdPath(taken));
  const dir = path.join(MEDIA_DIR, subdir);
  const thumbDir = path.join(MEDIA_DIR, 'thumbs', subdir);
  await ensureDir(dir);
  await ensureDir(thumbDir);

  const ext = extFor(file.mimeType);
  const baseName = `gd_${file.id}.${ext}`;
  const fileAbs  = path.join(dir, baseName);
  const thumbAbs = path.join(thumbDir, baseName.replace(/\.[^.]+$/, '.webp'));

  process.stdout.write(`↓ ${baseName} ... `);
  try {
    const res = await drive.files.get(
      { fileId: file.id, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' },
    );
    await pipeline(res.data as any, createWriteStream(fileAbs));
  } catch (e) {
    console.log(`fail: ${e instanceof Error ? e.message : e}`);
    return;
  }

  const thumbed = await makeThumb(fileAbs, kind, thumbAbs);

  let w: number | undefined, h: number | undefined;
  if (file.imageMediaMetadata?.width)  w = file.imageMediaMetadata.width;
  if (file.imageMediaMetadata?.height) h = file.imageMediaMetadata.height;
  if (file.videoMediaMetadata?.width)  w = file.videoMediaMetadata.width;
  if (file.videoMediaMetadata?.height) h = file.videoMediaMetadata.height;
  const dur = file.videoMediaMetadata?.durationMillis
    ? Math.round(Number(file.videoMediaMetadata.durationMillis) / 1000)
    : undefined;

  await prisma.media.create({
    data: {
      source: 'drive',
      driveFileId: file.id,
      drivePath: parentPath ? `${parentPath}/${file.name}` : file.name,
      kind,
      mime: file.mimeType,
      width: w ?? null,
      height: h ?? null,
      duration: dur ?? null,
      bytes: Number(file.size ?? 0) || null,
      filePath: path.relative(MEDIA_DIR, fileAbs).replace(/\\/g, '/'),
      thumbPath: thumbed ? path.relative(MEDIA_DIR, thumbAbs).replace(/\\/g, '/') : null,
      caption: file.description ?? null,
      takenAt: taken,
    },
  });
  console.log('ok');
}

async function listFolderRecursive(drive: drive_v3.Drive, folderId: string, parentPath = ''): Promise<void> {
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, description, imageMediaMetadata, videoMediaMetadata)',
      pageSize: 1000,
      pageToken,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });
    for (const f of res.data.files ?? []) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        await listFolderRecursive(drive, f.id!, parentPath ? `${parentPath}/${f.name}` : f.name!);
      } else {
        await importFile(drive, f, parentPath);
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
}

async function startPageToken(drive: drive_v3.Drive): Promise<string> {
  const r = await drive.changes.getStartPageToken({ supportsAllDrives: true });
  return r.data.startPageToken!;
}

async function pollChanges(drive: drive_v3.Drive, token: string): Promise<string> {
  let pageToken: string | undefined = token;
  let newStart = token;
  while (pageToken) {
    const r: any = await drive.changes.list({
      pageToken,
      fields: 'nextPageToken, newStartPageToken, changes(fileId, removed, file(id, name, mimeType, size, createdTime, description, imageMediaMetadata, videoMediaMetadata, parents))',
      pageSize: 1000,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      includeRemoved: false,
    });
    for (const ch of r.data.changes ?? []) {
      if (!ch.file || ch.removed) continue;
      // If we have folder filters, only import descendants of any of them.
      if (FOLDER_IDS.length) {
        let inAny = false;
        for (const root of FOLDER_IDS) {
          if (await isInFolder(drive, ch.file.id!, root)) { inAny = true; break; }
        }
        if (!inAny) continue;
      }
      await importFile(drive, ch.file).catch((e) => console.error('change import:', e));
    }
    if (r.data.newStartPageToken) newStart = r.data.newStartPageToken;
    pageToken = r.data.nextPageToken ?? undefined;
  }
  return newStart;
}

const folderCache = new Map<string, boolean>();
async function isInFolder(drive: drive_v3.Drive, fileId: string, target: string): Promise<boolean> {
  const cacheKey = `${fileId}->${target}`;
  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey)!;
  let cur: string[] = [fileId];
  for (let depth = 0; depth < 6 && cur.length; depth++) {
    const next: string[] = [];
    for (const id of cur) {
      try {
        const r = await drive.files.get({ fileId: id, fields: 'parents', supportsAllDrives: true });
        for (const p of r.data.parents ?? []) {
          if (p === target) { folderCache.set(cacheKey, true); return true; }
          next.push(p);
        }
      } catch {}
    }
    cur = next;
  }
  folderCache.set(cacheKey, false);
  return false;
}

async function main() {
  await ensureDir(MEDIA_DIR);
  const drive = await authedDrive();
  console.log('● connected to Google Drive');

  let state = await prisma.syncState.upsert({
    where: { source: 'drive' }, update: {}, create: { source: 'drive' },
  });

  // First-time backfill
  if (!state.cursor) {
    if (FOLDER_IDS.length === 0) {
      console.warn('DRIVE_FOLDER_ID is empty — skipping recursive backfill (would scan your whole Drive).');
    } else {
      for (const root of FOLDER_IDS) {
        console.log(`↻ backfilling Drive folder ${root}`);
        try { await listFolderRecursive(drive, root); }
        catch (e) { console.error(`  failed for ${root}:`, e instanceof Error ? e.message : e); }
      }
    }
    const start = await startPageToken(drive);
    state = await prisma.syncState.update({
      where: { source: 'drive' }, data: { cursor: start, lastRunAt: new Date() },
    });
    console.log(`✓ backfill done; tracking changes from token ${start}`);
  }

  // Poll changes forever
  while (true) {
    try {
      const next = await pollChanges(drive, state.cursor!);
      state = await prisma.syncState.update({
        where: { source: 'drive' },
        data: { cursor: next, lastRunAt: new Date(), lastError: null },
      });
    } catch (e) {
      console.error('drive poll error:', e);
      await prisma.syncState.update({
        where: { source: 'drive' }, data: { lastError: String(e) },
      }).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
