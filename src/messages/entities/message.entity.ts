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

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chat_id', type: 'varchar', length: 36 })
  chatId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  /** URL файлу в Cloudinary (secure_url після серверного завантаження) */
  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl: string | null;

  @Column({ name: 'attachment_mime_type', type: 'varchar', length: 255, nullable: true })
  attachmentMimeType: string | null;

  @Column({ name: 'original_filename', type: 'varchar', length: 512, nullable: true })
  originalFilename: string | null;

  @Column({ name: 'reply_to_id', type: 'varchar', length: 36, nullable: true })
  replyToId: string | null;

  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
