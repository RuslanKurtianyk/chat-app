/**
 * Loose check for PostgreSQL-compatible UUID strings (8-4-4-4-12 hex).
 * Used before writes to uuid columns when the id comes from external input (e.g. Socket.IO query).
 */
const PG_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidString(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return PG_UUID_RE.test(value.trim());
}
