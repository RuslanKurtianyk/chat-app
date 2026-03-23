import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { Folder } from './folder.entity';
import { Chat } from '../../chats/entities/chat.entity';

@Entity('folder_chats')
export class FolderChat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Folder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'folder_id' })
  folder: Folder;

  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @RelationId((fc: FolderChat) => fc.folder)
  folderId: string;

  @RelationId((fc: FolderChat) => fc.chat)
  chatId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
