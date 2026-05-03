import path from 'node:path';
import { promises as fs } from 'node:fs';

export const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR ?? './media');

export function safeJoin(base: string, rel: string): string {
  const resolved = path.resolve(base, rel);
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error('Path traversal blocked');
  }
  return resolved;
}

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.m4v': 'video/x-m4v',
  };
  return map[ext] ?? 'application/octet-stream';
}
