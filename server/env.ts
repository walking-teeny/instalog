// Must be the first import in server.ts: loading .env.local here (as its own
// module) guarantees it runs before any other server module's top-level code,
// since sibling imports evaluate in the order they're listed.
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
