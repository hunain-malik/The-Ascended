/**
 * Load env in the same order Next.js does: .env.local first (overrides),
 * then .env. Both are read; first to set a key wins.
 *
 * import this at the very top of every standalone script:
 *   import './_env';
 */
import { config } from 'dotenv';
import path from 'node:path';

const root = process.cwd();
config({ path: path.join(root, '.env.local') });
config({ path: path.join(root, '.env') });
