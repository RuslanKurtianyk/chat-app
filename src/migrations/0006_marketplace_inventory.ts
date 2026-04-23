import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarketplaceInventory0006174319000000 implements MigrationInterface {
  name = 'MarketplaceInventory0006174319000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_inventory" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity" int NOT NULL,
        CONSTRAINT "UQ_user_inventory_user_product" UNIQUE ("user_id", "product_id"),
        CONSTRAINT "FK_user_inventory_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_inventory_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_user_inventory_qty" CHECK ("quantity" >= 0)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_listings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "seller_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "unit_price" bigint NOT NULL,
        "currency" varchar(12) NOT NULL DEFAULT 'COIN',
        "quantity_available" int NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_product_listings_seller" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_product_listings_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_product_listings_qty" CHECK ("quantity_available" >= 0)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_listings_active"
      ON "product_listings" ("active")
      WHERE "active" = true;
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "type" TYPE varchar(32);
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ADD COLUMN IF NOT EXISTS "listing_id" uuid NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP COLUMN IF EXISTS "listing_id";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_listings";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_inventory";`);
  }
}
