/**
 * CORS для Express (REST) і Socket.IO мають збігатися, інакше з localhost
 * до Render підуть блокування (особливо WebSocket handshake).
 */

const LOCALHOST_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

export type CorsMode =
  | { mode: 'permissive' }
  | { mode: 'explicit'; origin: string | string[]; credentials: boolean };

export function getCorsMode(): CorsMode {
  const raw = process.env.CORS_ORIGIN?.trim();
  const allowLocal = process.env.CORS_ALLOW_LOCALHOST === 'true';

  const fromEnv = raw
    ? raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (fromEnv.length === 0 && !allowLocal) {
    return { mode: 'permissive' };
  }

  const merged = [
    ...new Set([...fromEnv, ...(allowLocal ? LOCALHOST_ORIGINS : [])]),
  ];
  const origin = merged.length === 1 ? merged[0] : merged;
  return { mode: 'explicit', origin, credentials: true };
}

/** Опції для `socket.io` Server */
export function getSocketIoCorsOptions() {
  const mode = getCorsMode();
  if (mode.mode === 'permissive') {
    return { origin: true };
  }
  return {
    origin: mode.origin,
    credentials: mode.credentials,
  };
}
