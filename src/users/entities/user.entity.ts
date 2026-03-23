import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  mobile: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  /** Логотип/аватар (URL) */
  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  /** Нікнейм */
  @Column({ type: 'varchar', length: 50, nullable: true })
  nickname: string | null;

  /** Остання активність (для індикатора) */
  @Column({ name: 'last_active_at', type: 'timestamp', nullable: true })
  lastActiveAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
