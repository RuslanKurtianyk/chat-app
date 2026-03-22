import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Chat } from '../../chats/entities/chat.entity';

export type CallStatus = 'ringing' | 'active' | 'ended';

@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chat_id', type: 'varchar', length: 36 })
  chatId: string;

  @Column({ name: 'initiator_id', type: 'varchar', length: 36 })
  initiatorId: string;

  @Column({ type: 'varchar', length: 20, default: 'ringing' })
  status: CallStatus;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'ended_at', type: 'datetime', nullable: true })
  endedAt: Date | null;

  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'initiator_id' })
  initiator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
