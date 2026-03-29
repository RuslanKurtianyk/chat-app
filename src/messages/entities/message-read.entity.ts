import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  Unique,
} from 'typeorm';
import { Message } from './message.entity';
import { User } from '../../users/entities/user.entity';

@Entity('message_reads')
@Unique('UQ_message_read_pair', ['message', 'user'])
export class MessageRead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @RelationId((r: MessageRead) => r.message)
  messageId: string;

  @RelationId((r: MessageRead) => r.user)
  userId: string;

  @CreateDateColumn({ name: 'read_at' })
  readAt: Date;
}
