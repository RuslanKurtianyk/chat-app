import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarketplaceOffers0007174319000000 implements MigrationInterface {
  name = 'MarketplaceOffers0007174319000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketplace_offers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "listing_id" uuid NOT NULL,
        "buyer_id" uuid NOT NULL,
        "seller_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity" int NOT NULL,
        "unit_price" bigint NOT NULL,
        "currency" varchar(12) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_marketplace_offers_listing" FOREIGN KEY ("listing_id") REFERENCES "product_listings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_marketplace_offers_buyer" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_marketplace_offers_seller" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_marketplace_offers_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_marketplace_offers_qty" CHECK ("quantity" >= 1)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_marketplace_offers_listing"
      ON "marketplace_offers" ("listing_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_marketplace_offers_buyer_status"
      ON "marketplace_offers" ("buyer_id", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_marketplace_offers_seller_status"
      ON "marketplace_offers" ("seller_id", "status");
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ADD COLUMN IF NOT EXISTS "offer_id" uuid NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP COLUMN IF EXISTS "offer_id";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace_offers";`);
  }
}
