import { DataSource } from 'typeorm';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolvePostgresToIpv4Host } from './config/postgres-ipv4-host';

import { User } from './users/entities/user.entity';
import { Chat } from './chats/entities/chat.entity';
import { ChatMember } from './chats/entities/chat-member.entity';
import { Message } from './messages/entities/message.entity';
import { MessageRead } from './messages/entities/message-read.entity';
import { Call } from './calls/entities/call.entity';
import { Story } from './stories/entities/story.entity';
import { Folder } from './folders/entities/folder.entity';
import { FolderChat } from './folders/entities/folder-chat.entity';
import { LocationPoint } from './geolocation/entities/location-point.entity';
import { Product } from './products/entities/product.entity';
import { WalletAccount } from './wallet/entities/wallet-account.entity';
import { WalletTransaction } from './wallet/entities/wallet-transaction.entity';

import { InitSchema0001174318618500 } from './migrations/0001_init_schema';
import { WalletProducts0002174318625000 } from './migrations/0002_wallet_products';
import { ProductImageUrl0003174318628000 } from './migrations/0003_product_image_url';
import { AddMissingUsersColumns0004174319000000 } from './migrations/0004_add_missing_users_columns';

function loadDotEnvIfPresent() {
  const p = join(process.cwd(), '.env');
  if (!existsSync(p)) return;
  const text = readFileSync(p, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnvIfPresent();

const entities = [
  User,
  Chat,
  ChatMember,
  Message,
  MessageRead,
  Call,
  Story,
  Folder,
  FolderChat,
  LocationPoint,
  Product,
  WalletAccount,
  WalletTransaction,
];

const migrations = [
  InitSchema0001174318618500,
  WalletProducts0002174318625000,
  ProductImageUrl0003174318628000,
  AddMissingUsersColumns0004174319000000,
];

async function buildPostgresDataSource() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL is required for migrations');
  }
  const ssl =
    process.env.DATABASE_SSL === 'true' || /supabase\.co/i.test(url)
      ? { rejectUnauthorized: false }
      : undefined;

  const resolved = await resolvePostgresToIpv4Host(url, ssl);
  if (resolved.mode === 'url') {
    return new DataSource({
      type: 'postgres',
      url: resolved.url,
      ssl: resolved.ssl as any,
      entities,
      migrations,
    });
  }
  return new DataSource({
    type: 'postgres',
    host: resolved.host,
    port: resolved.port,
    username: resolved.username,
    password: resolved.password,
    database: resolved.database,
    ssl: resolved.ssl as any,
    entities,
    migrations,
  });
}

// TypeORM CLI expects a DataSource export, not a Promise, so we create with URL mode first.
// Migrations in this project are intended for Postgres; for local SQLite keep synchronize.
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL?.trim(),
  ssl:
    process.env.DATABASE_SSL === 'true' ||
    /supabase\.co/i.test(process.env.DATABASE_URL || '')
      ? { rejectUnauthorized: false }
      : undefined,
  entities,
  migrations,
});

// Optional helper for app/scripts (not used by CLI directly).
export { buildPostgresDataSource };

