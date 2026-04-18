import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatImageUrl0005174319000000 implements MigrationInterface {
  name = 'ChatImageUrl0005174319000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chats"
      ADD COLUMN IF NOT EXISTS "image_url" text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chats"
      DROP COLUMN IF EXISTS "image_url";
    `);
  }
}
