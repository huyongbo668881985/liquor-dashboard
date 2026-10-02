import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'node:fs';

if (!process.env.DIRECT_URL) throw new Error('DIRECT_URL is required');
const client = new pg.Client({ connectionString: process.env.DIRECT_URL, connectionTimeoutMillis:10000 });
await client.connect();
try {
  const role = (await client.query("SELECT current_user,rolbypassrls FROM pg_roles WHERE rolname=current_user")).rows[0];
  if (role.current_user !== 'postgres' || !role.rolbypassrls) {
    throw new Error('Migration requires the server postgres role with BYPASSRLS');
  }
  await client.query(readFileSync('prisma/migrations/20261002000000_lock_down_public_data_api/migration.sql', 'utf8'));
  console.log('Committed security migration to the database configured by DIRECT_URL');
} finally {
  await client.end();
}
