import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductImageUrl0003174318628000 implements MigrationInterface {
  name = 'ProductImageUrl0003174318628000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Works even if the column/table already exists.
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "image_url" text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "image_url";
    `);
  }
}
