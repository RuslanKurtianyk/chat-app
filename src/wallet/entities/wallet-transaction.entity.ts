import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WalletAccount } from './wallet-account.entity';

export type WalletTransactionType =
  | 'adjustment'
  | 'earn'
  | 'transfer_in'
  | 'transfer_out'
  | 'purchase';

@Entity('wallet_transactions')
@Index('IDX_wallet_tx_user_created', ['user', 'createdAt'])
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WalletAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: WalletAccount;

  @RelationId((t: WalletTransaction) => t.account)
  accountId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @RelationId((t: WalletTransaction) => t.user)
  userId: string;

  @Column({ type: 'varchar', length: 16 })
  type: WalletTransactionType;

  /** Positive or negative, in minor units. */
  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'varchar', length: 12, default: 'COIN' })
  currency: string;

  /** Optional counterparty for transfers. */
  @Column({ name: 'counterparty_user_id', type: 'uuid', nullable: true })
  counterpartyUserId: string | null;

  /** Optional product reference for purchases. */
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

