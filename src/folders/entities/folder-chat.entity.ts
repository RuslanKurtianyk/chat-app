import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Folder } from './folder.entity';
import { Chat } from '../../chats/entities/chat.entity';

@Entity('folder_chats')
export class FolderChat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'folder_id', type: 'varchar', length: 36 })
  folderId: string;

  @Column({ name: 'chat_id', type: 'varchar', length: 36 })
  chatId: string;

  @ManyToOne(() => Folder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'folder_id' })
  folder: Folder;

  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
