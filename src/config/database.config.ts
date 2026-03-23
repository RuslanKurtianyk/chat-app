import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  /** Локально: ігнорувати DATABASE_URL і взяти SQLite (не видаляючи рядок з .env). */
  const forceSqlite =
    process.env.FORCE_SQLITE === 'true' ||
    process.env.LOCAL_USE_SQLITE === 'true';
  const url = forceSqlite ? null : process.env.DATABASE_URL?.trim();
  const nodeEnv = process.env.NODE_ENV || 'development';
  const explicitSync = process.env.DATABASE_SYNC;
  const sync =
    explicitSync === 'true' ||
    (explicitSync !== 'false' && nodeEnv !== 'production');

  let ssl: boolean | { rejectUnauthorized: boolean } | undefined;
  if (process.env.DATABASE_SSL === 'true') {
    ssl = { rejectUnauthorized: false };
  } else if (process.env.DATABASE_SSL === 'false') {
    ssl = false;
  } else if (url && /supabase\.co/i.test(url)) {
    ssl = { rejectUnauthorized: false };
  }

  return {
    url: url || null,
    synchronize: sync,
    ssl,
  };
});
