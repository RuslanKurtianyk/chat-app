import * as net from 'node:net';
import { parse } from 'pg-connection-string';
import dnsPromises, { Resolver } from 'node:dns/promises';

export type PgSslSetting =
  | boolean
  | {
      rejectUnauthorized?: boolean;
      servername?: string;
      [key: string]: unknown;
    }
  | undefined;

function parseDnsServers(): string[] {
  const raw = process.env.DATABASE_DNS_SERVERS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ['1.1.1.1', '8.8.8.8'];
}

/**
 * Системний `lookup` на Render інколи не дає A-запис; `resolve4` ходить у DNS напряму.
 * Додатково — Resolver на публічні DNS, якщо кластерний резолвер віддає лише AAAA.
 */
async function resolveFirstIpv4(hostname: string): Promise<string> {
  try {
    const list = await dnsPromises.resolve4(hostname);
    if (list?.length) return list[0];
  } catch {
    /* try next */
  }

  try {
    const { address } = await dnsPromises.lookup(hostname, { family: 4 });
    if (address) return address;
  } catch {
    /* try next */
  }

  const resolver = new Resolver();
  resolver.setServers(parseDnsServers());
  const list = await resolver.resolve4(hostname);
  if (!list?.length) {
    throw new Error('resolve4 returned empty list');
  }
  return list[0];
}

function isSupabaseUrl(url: string): boolean {
  return /supabase\.co/i.test(url);
}

/**
 * На Render часто немає IPv6; direct `db.*.supabase.co` інколи має лише AAAA → ENETUNREACH.
 * Беремо A-запис (IPv4), підключаємось за IP, TLS SNI = оригінальний hostname.
 *
 * Вимкнути: DATABASE_IPV4_LOOKUP=false
 * Свої DNS для кроку Resolver: DATABASE_DNS_SERVERS=1.1.1.1,8.8.8.8
 */
export async function resolvePostgresToIpv4Host(
  databaseUrl: string,
  ssl: PgSslSetting,
): Promise<
  | { mode: 'url'; url: string; ssl: PgSslSetting }
  | {
      mode: 'params';
      host: string;
      port: number;
      username: string | undefined;
      password: string | undefined;
      database: string | undefined;
      ssl: PgSslSetting;
    }
> {
  if (process.env.DATABASE_IPV4_LOOKUP === 'false') {
    return { mode: 'url', url: databaseUrl, ssl };
  }

  let parsed: ReturnType<typeof parse>;
  try {
    parsed = parse(databaseUrl);
  } catch {
    return { mode: 'url', url: databaseUrl, ssl };
  }

  const hostname = parsed.host;
  if (!hostname || net.isIP(hostname) !== 0) {
    return { mode: 'url', url: databaseUrl, ssl };
  }

  let address: string;
  try {
    address = await resolveFirstIpv4(hostname);
  } catch (err) {
    if (isSupabaseUrl(databaseUrl)) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `PostgreSQL: немає IPv4 (A) для "${hostname}" (${msg}). ` +
          `У Supabase Direct часто позначено як «Not IPv4 compatible» — на Render потрібен pooler. ` +
          `Постав у DATABASE_URL URI з «Session pooler» (рекомендація Supabase для IPv4) або «Transaction pooler» (6543). ` +
          `Див. DEPLOY.md.`,
      );
    }
    return { mode: 'url', url: databaseUrl, ssl };
  }

  const port = parsed.port ? parseInt(String(parsed.port), 10) : 5432;

  let sslOut: PgSslSetting = ssl;
  if (ssl !== false && ssl !== undefined) {
    sslOut =
      typeof ssl === 'object'
        ? { ...ssl, servername: hostname }
        : { rejectUnauthorized: false, servername: hostname };
  }

  return {
    mode: 'params',
    host: address,
    port,
    username: parsed.user,
    password: parsed.password,
    database: parsed.database ?? undefined,
    ssl: sslOut,
  };
}
