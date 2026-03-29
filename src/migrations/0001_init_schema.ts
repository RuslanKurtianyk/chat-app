import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Початкова схема (Postgres) у форматі idempotent SQL.
 * Працює і для "порожньої" БД, і для вже створених таблиць.
 *
 * В проді рекомендується запускати через:
 *   npm run migration:run
 */
export class InitSchema0001174318618500 implements MigrationInterface {
  name = 'InitSchema0001174318618500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // UUID extension (Supabase зазвичай має, але на всяк випадок)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // USERS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "mobile" varchar NOT NULL UNIQUE,
        "password_hash" varchar NOT NULL,
        "avatar_url" text NULL,
        "name" varchar(200) NULL,
        "nickname" varchar(50) NULL,
        "last_active_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
    `);

    // CHATS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chats" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "is_private" boolean NOT NULL DEFAULT false,
        "is_group" boolean NOT NULL DEFAULT false,
        "owner_id" uuid NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_chats_owner'
        ) THEN
          ALTER TABLE "chats"
          ADD CONSTRAINT "FK_chats_owner"
          FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // CHAT MEMBERS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_members" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "chat_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "joined_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    // Existing DBs may have duplicate (chat_id, user_id) from before this constraint; unique index would fail.
    await queryRunner.query(`
      DELETE FROM "chat_members" cm
      WHERE EXISTS (
        SELECT 1 FROM "chat_members" cm2
        WHERE cm2.chat_id = cm.chat_id
          AND cm2.user_id = cm.user_id
          AND cm2.id < cm.id
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_members_pair"
      ON "chat_members" ("chat_id", "user_id");
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_chat_members_chat') THEN
          ALTER TABLE "chat_members"
          ADD CONSTRAINT "FK_chat_members_chat"
          FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_chat_members_user') THEN
          ALTER TABLE "chat_members"
          ADD CONSTRAINT "FK_chat_members_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // MESSAGES
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "attachment_url" text NULL,
        "attachment_mime_type" varchar(255) NULL,
        "original_filename" varchar(512) NULL,
        "reply_to_id" varchar NULL,
        "chat_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_messages_chat') THEN
          ALTER TABLE "messages"
          ADD CONSTRAINT "FK_messages_chat"
          FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_messages_user') THEN
          ALTER TABLE "messages"
          ADD CONSTRAINT "FK_messages_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_messages_chat_created"
      ON "messages" ("chat_id", "created_at" DESC);
    `);

    // MESSAGE READS (read receipts)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "message_reads" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "message_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "read_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      DELETE FROM "message_reads" mr
      WHERE EXISTS (
        SELECT 1 FROM "message_reads" mr2
        WHERE mr2.message_id = mr.message_id
          AND mr2.user_id = mr.user_id
          AND mr2.id < mr.id
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_message_read_pair"
      ON "message_reads" ("message_id", "user_id");
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_message_reads_message') THEN
          ALTER TABLE "message_reads"
          ADD CONSTRAINT "FK_message_reads_message"
          FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_message_reads_user') THEN
          ALTER TABLE "message_reads"
          ADD CONSTRAINT "FK_message_reads_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // CALLS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "calls" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "status" varchar(20) NOT NULL DEFAULT 'ringing',
        "started_at" timestamp NULL,
        "ended_at" timestamp NULL,
        "chat_id" uuid NOT NULL,
        "initiator_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_calls_chat') THEN
          ALTER TABLE "calls"
          ADD CONSTRAINT "FK_calls_chat"
          FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_calls_initiator') THEN
          ALTER TABLE "calls"
          ADD CONSTRAINT "FK_calls_initiator"
          FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // STORIES
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stories" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "media_url" varchar NOT NULL,
        "caption" text NULL,
        "expires_at" timestamp NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_stories_user') THEN
          ALTER TABLE "stories"
          ADD CONSTRAINT "FK_stories_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // FOLDERS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "folders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "order" int NOT NULL DEFAULT 0,
        "user_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_folders_user') THEN
          ALTER TABLE "folders"
          ADD CONSTRAINT "FK_folders_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // FOLDER_CHATS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "folder_chats" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "folder_id" uuid NOT NULL,
        "chat_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      DELETE FROM "folder_chats" fc
      WHERE EXISTS (
        SELECT 1 FROM "folder_chats" fc2
        WHERE fc2.folder_id = fc.folder_id
          AND fc2.chat_id = fc.chat_id
          AND fc2.id < fc.id
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_folder_chats_pair"
      ON "folder_chats" ("folder_id", "chat_id");
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_folder_chats_folder') THEN
          ALTER TABLE "folder_chats"
          ADD CONSTRAINT "FK_folder_chats_folder"
          FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_folder_chats_chat') THEN
          ALTER TABLE "folder_chats"
          ADD CONSTRAINT "FK_folder_chats_chat"
          FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // LOCATION POINTS
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "location_points" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "lat" decimal(10,7) NOT NULL,
        "lng" decimal(10,7) NOT NULL,
        "shared_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "user_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_location_points_user') THEN
          ALTER TABLE "location_points"
          ADD CONSTRAINT "FK_location_points_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Для safety: у цьому проєкті down не чіпає таблиці автоматично.
    // Якщо треба rollback — робимо окремою міграцією/ручним SQL.
    await queryRunner.query(`SELECT 1;`);
  }
}

