import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('wallet_accounts')
@Index('UQ_wallet_user_currency', ['user', 'currency'], { unique: true })
export class WalletAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @RelationId((a: WalletAccount) => a.user)
  userId: string;

  /** ISO 4217-like code (e.g. USD, UAH) or in-app code (e.g. COIN). */
  @Column({ type: 'varchar', length: 12, default: 'COIN' })
  currency: string;

  /**
   * Balance in minor units as string to be safe with bigint.
   * Postgres returns bigint as string anyway.
   */
  @Column({ type: 'bigint', default: '0' })
  balance: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

