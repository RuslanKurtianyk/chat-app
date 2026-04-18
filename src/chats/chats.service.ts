import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Express } from 'express';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Chat } from './entities/chat.entity';
import { ChatMember } from './entities/chat-member.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { CloudinaryService } from '../storage/cloudinary.service';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepo: Repository<Chat>,
    @InjectRepository(ChatMember)
    private readonly memberRepo: Repository<ChatMember>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(ownerId: string, dto: CreateChatDto): Promise<Chat> {
    const isGroup = dto.isGroup ?? false;
    if (dto.imageUrl != null && dto.imageUrl !== '' && !isGroup) {
      throw new BadRequestException('imageUrl is only allowed for group chats');
    }
    const chat = this.chatRepo.create({
      name: dto.name,
      isPrivate: dto.isPrivate ?? false,
      isGroup,
      imageUrl: isGroup ? (dto.imageUrl?.trim() || null) : null,
      owner: { id: ownerId } as User,
    });
    const saved = await this.chatRepo.save(chat);
    await this.memberRepo.save(
      this.memberRepo.create({
        chat: { id: saved.id } as Chat,
        user: { id: ownerId } as User,
      }),
    );
    return saved;
  }

  async findAll(): Promise<Chat[]> {
    return this.chatRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Chat | null> {
    return this.chatRepo.findOne({ where: { id }, relations: ['owner'] });
  }

  async findMyChats(userId: string): Promise<Chat[]> {
    const members = await this.memberRepo.find({
      where: { user: { id: userId } },
      relations: ['chat', 'chat.owner'],
    });
    return members.map((m) => m.chat).filter(Boolean);
  }

  async findPublic(search?: string): Promise<Chat[]> {
    const qb = this.chatRepo
      .createQueryBuilder('c')
      .where('c.isPrivate = :priv', { priv: false })
      .orderBy('c.createdAt', 'DESC');
    if (search) {
      qb.andWhere('c.name LIKE :search', { search: `%${search}%` });
    }
    return qb.getMany();
  }

  async join(chatId: string, userId: string): Promise<{ joined: boolean }> {
    const chat = await this.findOne(chatId);
    if (!chat) throw new NotFoundException('Chat not found');
    const existing = await this.memberRepo.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
    });
    if (existing) return { joined: true };
    await this.memberRepo.save(
      this.memberRepo.create({
        chat: { id: chatId } as Chat,
        user: { id: userId } as User,
      }),
    );
    return { joined: true };
  }

  async leave(chatId: string, userId: string): Promise<{ left: boolean }> {
    await this.memberRepo
      .createQueryBuilder()
      .delete()
      .from(ChatMember)
      .where('chat_id = :chatId AND user_id = :userId', { chatId, userId })
      .execute();
    return { left: true };
  }

  async isMember(chatId: string, userId: string): Promise<boolean> {
    const m = await this.memberRepo.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
    });
    return !!m;
  }

  async update(id: string, userId: string, dto: UpdateChatDto): Promise<Chat> {
    const chat = await this.findOne(id);
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.owner?.id !== userId) throw new ForbiddenException('Not owner');
    if (
      dto.imageUrl !== undefined &&
      dto.imageUrl !== null &&
      String(dto.imageUrl).trim() !== '' &&
      !chat.isGroup
    ) {
      throw new BadRequestException('imageUrl is only allowed for group chats');
    }
    Object.assign(chat, dto);
    return this.chatRepo.save(chat);
  }

  /** Upload group cover image (owner only). Uses same storage as user uploads (Cloudinary or local dev). */
  async setGroupImageFromUpload(
    chatId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<Chat> {
    const chat = await this.findOne(chatId);
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.owner?.id !== userId) throw new ForbiddenException('Not owner');
    if (!chat.isGroup) {
      throw new BadRequestException('Group image is only for group chats');
    }
    const { secureUrl } = await this.cloudinary.uploadBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      { subfolder: 'group-chats' },
    );
    chat.imageUrl = secureUrl;
    return this.chatRepo.save(chat);
  }

  async remove(id: string, userId: string): Promise<void> {
    const chat = await this.findOne(id);
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.owner?.id !== userId) throw new ForbiddenException('Not owner');
    await this.chatRepo.delete(id);
  }
}
