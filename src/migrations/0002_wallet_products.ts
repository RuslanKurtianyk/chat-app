import { MigrationInterface, QueryRunner } from 'typeorm';

export class WalletProducts0002174318625000 implements MigrationInterface {
  name = 'WalletProducts0002174318625000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(120) NOT NULL,
        "price_amount" bigint NOT NULL,
        "currency" varchar(12) NOT NULL DEFAULT 'COIN',
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_active"
      ON "products" ("active");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_accounts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "currency" varchar(12) NOT NULL DEFAULT 'COIN',
        "balance" bigint NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_wallet_user_currency"
      ON "wallet_accounts" ("user_id", "currency");
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_wallet_accounts_user') THEN
          ALTER TABLE "wallet_accounts"
          ADD CONSTRAINT "FK_wallet_accounts_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "type" varchar(16) NOT NULL,
        "amount" bigint NOT NULL,
        "currency" varchar(12) NOT NULL DEFAULT 'COIN',
        "counterparty_user_id" uuid NULL,
        "product_id" uuid NULL,
        "note" text NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_tx_user_created"
      ON "wallet_transactions" ("user_id", "created_at");
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_wallet_tx_account') THEN
          ALTER TABLE "wallet_transactions"
          ADD CONSTRAINT "FK_wallet_tx_account"
          FOREIGN KEY ("account_id") REFERENCES "wallet_accounts"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_wallet_tx_user') THEN
          ALTER TABLE "wallet_transactions"
          ADD CONSTRAINT "FK_wallet_tx_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT 1;`);
  }
}
