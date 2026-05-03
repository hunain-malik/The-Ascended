#!/usr/bin/env tsx
/**
 * One-time Google Drive OAuth flow.
 * Reads OAuth client credentials, prints an auth URL, asks for the
 * code from the redirect, exchanges for a refresh token, writes it.
 *
 * Run: npm run drive:login
 */
import 'dotenv/config';
import { google } from 'googleapis';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const CRED_PATH  = path.resolve(process.env.GOOGLE_CREDENTIALS_PATH ?? './secrets/google-credentials.json');
const TOKEN_PATH = path.resolve(process.env.GOOGLE_TOKEN_PATH       ?? './secrets/google-token.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

async function main() {
  let creds: any;
  try { creds = JSON.parse(await fs.readFile(CRED_PATH, 'utf8')); }
  catch (e) {
    console.error(`\nCould not read ${CRED_PATH}\n` +
      `1. console.cloud.google.com -> APIs & Services -> Credentials\n` +
      `2. Create OAuth client ID -> Desktop app\n` +
      `3. Download JSON, save as ${CRED_PATH}\n`);
    process.exit(1);
  }

  const { client_id, client_secret, redirect_uris } = creds.installed ?? creds.web ?? {};
  if (!client_id || !client_secret) {
    console.error('Credentials JSON is missing client_id / client_secret. Did you create a "Desktop app" OAuth client?');
    process.exit(1);
  }
  const oauth2 = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris?.[0] ?? 'urn:ietf:wg:oauth:2.0:oob',
  );
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n1) Open this URL in your browser:\n');
  console.log(url);
  console.log('\n2) Approve. The page will redirect to a URL like\n   http://localhost/?code=4/0AY...&scope=...');
  console.log('   Copy the value of the `code` query parameter.\n');

  const rl = readline.createInterface({ input, output });
  const code = (await rl.question('Paste the code here: ')).trim();
  rl.close();

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    console.error('\nNo refresh_token returned. Revoke the app at https://myaccount.google.com/permissions and try again.');
    process.exit(1);
  }

  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log(`\n✓ Token written to ${TOKEN_PATH}`);
  console.log('  Now run `npm run sync:drive`.');
}

main().catch((e) => { console.error(e); process.exit(1); });
