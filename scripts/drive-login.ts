#!/usr/bin/env tsx
/**
 * Google Drive OAuth — loopback flow.
 *
 * Spins up a local HTTP listener, prints the auth URL, waits for Google
 * to redirect back with the code, exchanges it for a refresh token,
 * writes secrets/google-token.json, and exits.
 *
 * Run: npm run drive:login
 */
import './_env';
import { google } from 'googleapis';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { AddressInfo } from 'node:net';

const CRED_PATH  = path.resolve(process.env.GOOGLE_CREDENTIALS_PATH ?? './secrets/google-credentials.json');
const TOKEN_PATH = path.resolve(process.env.GOOGLE_TOKEN_PATH       ?? './secrets/google-token.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

async function main() {
  let creds: any;
  try { creds = JSON.parse(await fs.readFile(CRED_PATH, 'utf8')); }
  catch {
    console.error(`\nCould not read ${CRED_PATH}\n` +
      `1. console.cloud.google.com -> APIs & Services -> Credentials\n` +
      `2. Create OAuth client ID -> Desktop app\n` +
      `3. Download JSON, save as ${CRED_PATH}\n`);
    process.exit(1);
  }

  const c = creds.installed ?? creds.web ?? {};
  if (!c.client_id || !c.client_secret) {
    console.error('Credentials JSON missing client_id / client_secret. Did you create a "Desktop app" OAuth client?');
    process.exit(1);
  }

  // Bind to a random free port. Google allows any localhost port for
  // Desktop ("loopback IP address") OAuth clients.
  const server = http.createServer();
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  // Use the IP literal, not "localhost": on Windows the browser may resolve
  // localhost to ::1 (IPv6) while we listen on 127.0.0.1, and the redirect
  // dies with "site can't be reached". Google allows any loopback IP for
  // Desktop clients and recommends 127.0.0.1.
  const redirectUri = `http://127.0.0.1:${port}`;

  const oauth2 = new google.auth.OAuth2(c.client_id, c.client_secret, redirectUri);
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n=== OPEN THIS URL IN YOUR BROWSER ===\n');
  console.log(url);
  console.log('\n=====================================\n');
  console.log(`(listening on ${redirectUri} for the redirect)`);

  const code: string = await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const u = new URL(req.url ?? '/', redirectUri);
      const got = u.searchParams.get('code');
      const err = u.searchParams.get('error');
      if (err) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Auth error: ${err}</h1>`);
        reject(new Error(err));
        return;
      }
      if (!got) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>Waiting for Google…</h1>');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!doctype html><html><body style="font-family:system-ui;background:#0a0a0a;color:#eee;display:grid;place-items:center;height:100vh;margin:0;">
        <div style="text-align:center;">
          <h1 style="font-family:Georgia,serif;font-style:italic;">The Ascended is authorized.</h1>
          <p style="opacity:.6;">You can close this tab.</p>
        </div>
      </body></html>`);
      resolve(got);
    });
  });

  server.close();

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    console.error('\nNo refresh_token returned. Revoke the app at https://myaccount.google.com/permissions and re-run.');
    process.exit(1);
  }

  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log(`\n✓ Token written to ${TOKEN_PATH}`);
  console.log('  Now run `npm run sync:drive`.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
