import * as net from 'node:net';
import { parse } from 'pg-connection-string';
import { promises as dnsPromises } from 'node:dns';

export type PgSslSetting =
  | boolean
  | { rejectUnauthorized?: boolean; servername?: string; [key: string]: unknown }
  | undefined;

/**
 * На Render часто немає IPv6; Supabase direct host інколи має лише AAAA → ENETUNREACH.
 * `dns.setDefaultResultOrder('ipv4first')` тоді не допомагає (немає A-запису).
 * Резолвимо лише IPv4 і підключаємось за IP; для TLS залишаємо SNI = оригінальний hostname.
 *
 * Вимкнути: DATABASE_IPV4_LOOKUP=false
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

  try {
    const { address } = await dnsPromises.lookup(hostname, { family: 4 });
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
  } catch {
    return { mode: 'url', url: databaseUrl, ssl };
  }
}
