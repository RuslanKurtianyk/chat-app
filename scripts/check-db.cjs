#!/usr/bin/env node
/**
 * Перевірка DATABASE_URL (Supabase / Postgres) без запуску Nest.
 * Використання:
 *   npm run check:db
 *   DATABASE_URL="postgresql://..." npm run check:db
 *
 * Якщо змінна не в process.env, підхоплюємо перший рядок DATABASE_URL= з .env у корені.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

const url = (process.env.DATABASE_URL || '').trim();
if (!url) {
  console.error(
    'Missing DATABASE_URL. Set it in .env or run:\n  DATABASE_URL="postgresql://..." npm run check:db',
  );
  process.exit(1);
}

const useSsl =
  /supabase\.co/i.test(url) ||
  process.env.DATABASE_SSL === 'true' ||
  /\bsslmode=(require|verify-full|verify-ca)\b/i.test(url);

const client = new Client({
  connectionString: url,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

client
  .connect()
  .then(() =>
    client.query('SELECT 1 AS ok, current_database() AS database, current_user AS user'),
  )
  .then((res) => {
    console.log('OK — connected to Postgres:', res.rows[0]);
    return client.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err.message);
    if (/ENETUNREACH|ENOTFOUND|ECONNREFUSED/i.test(String(err.message))) {
      console.error(
        '\nHint: use Supabase Session or Transaction pooler URI (*.pooler.supabase.com), not Direct db.* if you see IPv6 / network errors.',
      );
    }
    process.exit(1);
  });
