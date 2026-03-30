import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingUsersColumns0004174319000000 implements MigrationInterface {
  name = 'AddMissingUsersColumns0004174319000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Some DBs may already have `users` created from an earlier/partial schema,
    // so we add missing columns in an idempotent way.
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "name" varchar(200) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "nickname" varchar(50) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "avatar_url" text NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "last_active_at" timestamp NULL;
    `);

    // `updatedAt` is required by TypeORM UpdateDateColumn (expects NOT NULL).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "updated_at" timestamp NOT NULL DEFAULT now();
        ELSE
          ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();
          UPDATE "users" SET "updated_at" = now() WHERE "updated_at" IS NULL;
          ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Project doesn't rely on automatic rollback.
    await queryRunner.query(`SELECT 1;`);
  }
}

