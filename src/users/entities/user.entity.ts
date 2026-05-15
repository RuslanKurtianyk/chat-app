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

  /** Повне ім’я / відображуване ім’я (окремо від нікнейму). */
  @Column({ type: 'varchar', length: 200, nullable: true })
  name: string | null;

  /** Нікнейм (публічний псевдонім). */
  @Column({ type: 'varchar', length: 50, nullable: true })
  nickname: string | null;

  /** Остання активність (для індикатора) */
  @Column({ name: 'last_active_at', type: 'timestamp', nullable: true })
  lastActiveAt: Date | null;

  /** Admin-only: user is blocked/banned from using the app. */
  @Column({ name: 'is_blocked', type: 'boolean', default: false })
  isBlocked: boolean;

  /** When the user was blocked (admin action). */
  @Column({ name: 'blocked_at', type: 'timestamp', nullable: true })
  blockedAt: Date | null;

  /** Optional admin note / reason. */
  @Column({ name: 'blocked_reason', type: 'text', nullable: true })
  blockedReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
