#!/usr/bin/env tsx
/**
 * Generate AUTH_PASSWORD_HASH and SESSION_SECRET for .env.local
 * Run: npm run set-password
 */
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const username = (await rl.question('Username (default: ascended): ')).trim() || 'ascended';
  const password = await rl.question('Password: ');
  rl.close();
  if (!password || password.length < 8) {
    console.error('\nPassword must be at least 8 characters.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  const secret = crypto.randomBytes(32).toString('hex');

  // @next/env (dotenv-expand) interpolates $VAR by default and would mangle
  // the bcrypt hash. Escape every $ so the value survives.
  const escapedHash = hash.replace(/\$/g, '\\$');

  console.log('\nAdd these to your .env.local:\n');
  console.log(`AUTH_USERNAME=${username}`);
  console.log(`AUTH_PASSWORD_HASH=${escapedHash}`);
  console.log(`SESSION_SECRET=${secret}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
