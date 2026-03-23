import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Chat } from '../../chats/entities/chat.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  /** URL файлу в Cloudinary (secure_url після серверного завантаження) */
  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl: string | null;

  @Column({ name: 'attachment_mime_type', type: 'varchar', length: 255, nullable: true })
  attachmentMimeType: string | null;

  @Column({ name: 'original_filename', type: 'varchar', length: 512, nullable: true })
  originalFilename: string | null;

  /** Опційне посилання на інше повідомлення (без окремого JoinColumn — уникаємо self-relation + length/uuid). */
  @Column({ name: 'reply_to_id', type: 'varchar', nullable: true })
  replyToId: string | null;

  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @RelationId((m: Message) => m.chat)
  chatId: string;

  @RelationId((m: Message) => m.user)
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
