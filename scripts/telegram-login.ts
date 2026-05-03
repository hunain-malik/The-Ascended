#!/usr/bin/env tsx
/**
 * Interactive first-time Telegram login.
 * After it succeeds, copy the printed TG_SESSION value into .env.local.
 *
 * Get TG_API_ID and TG_API_HASH from https://my.telegram.org -> API development tools
 */
import 'dotenv/config';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH ?? '';
if (!apiId || !apiHash) {
  console.error('Set TG_API_ID and TG_API_HASH in .env.local first.');
  process.exit(1);
}

async function main() {
  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });

  const rl = readline.createInterface({ input, output });
  const ask = (q: string) => rl.question(q);

  await client.start({
    phoneNumber: async () => (await ask('Phone (e.g. +15551234567): ')).trim(),
    password:    async () => (await ask('2FA password (if set): ')).trim(),
    phoneCode:   async () => (await ask('Code from Telegram: ')).trim(),
    onError:     (err) => console.error(err),
  });

  rl.close();
  console.log('\n=== SAVE THIS in .env.local as TG_SESSION ===');
  console.log(client.session.save());
  console.log('=============================================\n');
  await client.disconnect();
  process.exit(0);
}

main();
