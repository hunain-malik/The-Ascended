#!/usr/bin/env tsx
/**
 * Long-running sync worker.
 *  - Backfills new messages from a chat (default: Saved Messages = "me")
 *  - Subscribes to new messages so newly-saved media appears in the gallery
 *
 * Run: npm run sync
 */
import 'dotenv/config';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR ?? './media');
const SOURCE = process.env.TG_SOURCE ?? 'me';
const INTERVAL = Number(process.env.TG_SYNC_INTERVAL ?? 60) * 1000;

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH ?? '';
const sessionStr = process.env.TG_SESSION ?? '';

if (!apiId || !apiHash || !sessionStr) {
  console.error('Run `npm run sync:login` first to get TG_SESSION.');
  process.exit(1);
}

async function ensureDir(p: string) { await fs.mkdir(p, { recursive: true }); }

function ymdPath(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return path.join(`${y}`, `${m}`);
}

function describeMedia(msg: any): { kind: string; mime?: string; w?: number; h?: number; dur?: number; bytes?: number; ext: string; uniqueId?: string } | null {
  const media = msg.media;
  if (!media) return null;

  if (media.className === 'MessageMediaPhoto' && media.photo) {
    const sizes = media.photo.sizes ?? [];
    const big = sizes[sizes.length - 1] ?? {};
    return {
      kind: 'photo',
      mime: 'image/jpeg',
      w: big.w, h: big.h,
      ext: 'jpg',
      uniqueId: String(media.photo.id),
    };
  }
  if (media.className === 'MessageMediaDocument' && media.document) {
    const doc = media.document;
    const mime = doc.mimeType as string;
    const isVideo = mime?.startsWith('video/');
    const isAnim  = (doc.attributes ?? []).some((a: any) => a.className === 'DocumentAttributeAnimated');
    const isImage = mime?.startsWith('image/');
    if (!isVideo && !isAnim && !isImage) return null;
    const v = (doc.attributes ?? []).find((a: any) => a.className === 'DocumentAttributeVideo');
    const ext =
      mime === 'video/mp4' ? 'mp4' :
      mime === 'video/quicktime' ? 'mov' :
      mime === 'image/webp' ? 'webp' :
      mime === 'image/png' ? 'png' :
      mime === 'image/jpeg' ? 'jpg' :
      'bin';
    return {
      kind: isAnim ? 'animation' : isVideo ? 'video' : 'photo',
      mime, ext,
      w: v?.w, h: v?.h,
      dur: v?.duration,
      bytes: Number(doc.size),
      uniqueId: String(doc.id),
    };
  }
  return null;
}

async function makeThumb(srcAbs: string, kind: string, dstAbs: string): Promise<boolean> {
  try {
    if (kind === 'video' || kind === 'animation') {
      // skip video thumbing; we let the file route serve a poster fallback
      return false;
    }
    await sharp(srcAbs).rotate().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dstAbs);
    return true;
  } catch (e) {
    console.warn('thumb failed', e instanceof Error ? e.message : e);
    return false;
  }
}

async function importMessage(client: TelegramClient, msg: any, chatId: string) {
  const meta = describeMedia(msg);
  if (!meta) return;
  if (meta.uniqueId) {
    const exists = await prisma.media.findUnique({ where: { tgUniqueId: meta.uniqueId } });
    if (exists) return;
  }
  const taken = msg.date ? new Date(msg.date * 1000) : new Date();
  const subdir = ymdPath(taken);
  const dir = path.join(MEDIA_DIR, subdir);
  const thumbDir = path.join(MEDIA_DIR, 'thumbs', subdir);
  await ensureDir(dir);
  await ensureDir(thumbDir);

  const baseName = `tg_${chatId}_${msg.id}.${meta.ext}`;
  const fileAbs = path.join(dir, baseName);
  const thumbAbs = path.join(thumbDir, baseName.replace(/\.[^.]+$/, '.webp'));

  process.stdout.write(`↓ ${baseName} ... `);
  try {
    const buf = await client.downloadMedia(msg, {});
    if (!buf) { console.log('skip (no buf)'); return; }
    await fs.writeFile(fileAbs, buf as Buffer);
  } catch (e) {
    console.log(`fail: ${e instanceof Error ? e.message : e}`);
    return;
  }

  const thumbed = await makeThumb(fileAbs, meta.kind, thumbAbs);

  await prisma.media.create({
    data: {
      source: 'telegram',
      tgChatId: chatId,
      tgMessageId: String(msg.id),
      tgUniqueId: meta.uniqueId ?? null,
      tgFileId: null,
      kind: meta.kind,
      mime: meta.mime ?? null,
      width: meta.w ?? null,
      height: meta.h ?? null,
      duration: meta.dur ?? null,
      bytes: meta.bytes ?? null,
      filePath: path.relative(MEDIA_DIR, fileAbs).replace(/\\/g, '/'),
      thumbPath: thumbed ? path.relative(MEDIA_DIR, thumbAbs).replace(/\\/g, '/') : null,
      caption: msg.message || null,
      takenAt: taken,
    },
  });
  console.log('ok');
}

async function backfill(client: TelegramClient) {
  const state = await prisma.syncState.upsert({
    where: { source: 'telegram' },
    update: {},
    create: { source: 'telegram' },
  });
  const minId = state.cursor ? Number(state.cursor) : 0;

  console.log(`↻ backfill from ${SOURCE} (since msgId>${minId})`);
  const entity = await client.getEntity(SOURCE);
  const chatId = String((entity as any).id);
  let highest = minId;

  for await (const msg of client.iterMessages(entity, { minId, reverse: true })) {
    if ((msg.id ?? 0) <= minId) continue;
    await importMessage(client, msg, chatId);
    if ((msg.id ?? 0) > highest) highest = msg.id;
  }

  await prisma.syncState.update({
    where: { source: 'telegram' },
    data: { cursor: String(highest), lastRunAt: new Date(), lastError: null },
  });
}

async function main() {
  await ensureDir(MEDIA_DIR);
  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, { connectionRetries: 5 });
  await client.connect();
  console.log('● connected to Telegram');

  // Live: react to new messages immediately
  client.addEventHandler(async (event: any) => {
    const msg = event.message;
    if (!msg?.media) return;
    const peer = msg.peerId;
    // Only Saved Messages (peer = self) when SOURCE=me
    if (SOURCE === 'me') {
      const me = await client.getMe();
      const isSaved = peer?.userId && String(peer.userId) === String((me as any).id);
      if (!isSaved) return;
    }
    const chatId = String(peer?.userId ?? peer?.chatId ?? peer?.channelId ?? 'unknown');
    await importMessage(client, msg, chatId).catch((e) => console.error('live import:', e));
  }, new NewMessage({}));

  // Periodic catch-up (in case live missed anything)
  while (true) {
    try { await backfill(client); }
    catch (e) {
      console.error('backfill error:', e);
      await prisma.syncState.update({ where: { source: 'telegram' }, data: { lastError: String(e) } }).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
