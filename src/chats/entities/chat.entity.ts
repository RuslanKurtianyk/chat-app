import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /** Приватний чат (1-1) чи публічний/група */
  @Column({ name: 'is_private', default: false })
  isPrivate: boolean;

  /** Група (багато учасників) */
  @Column({ name: 'is_group', default: false })
  isGroup: boolean;

  @Column({ name: 'owner_id', type: 'varchar', length: 36 })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
