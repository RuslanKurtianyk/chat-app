import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { ChatMember } from './entities/chat-member.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepo: Repository<Chat>,
    @InjectRepository(ChatMember)
    private readonly memberRepo: Repository<ChatMember>,
  ) {}

  async create(ownerId: string, dto: CreateChatDto): Promise<Chat> {
    const chat = this.chatRepo.create({
      name: dto.name,
      isPrivate: dto.isPrivate ?? false,
      isGroup: dto.isGroup ?? false,
      ownerId,
    });
    const saved = await this.chatRepo.save(chat);
    await this.memberRepo.save(
      this.memberRepo.create({ chatId: saved.id, userId: ownerId }),
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
      where: { userId },
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
      where: { chatId, userId },
    });
    if (existing) return { joined: true };
    await this.memberRepo.save(this.memberRepo.create({ chatId, userId }));
    return { joined: true };
  }

  async leave(chatId: string, userId: string): Promise<{ left: boolean }> {
    await this.memberRepo.delete({ chatId, userId });
    return { left: true };
  }

  async isMember(chatId: string, userId: string): Promise<boolean> {
    const m = await this.memberRepo.findOne({ where: { chatId, userId } });
    return !!m;
  }

  async update(id: string, userId: string, dto: UpdateChatDto): Promise<Chat> {
    const chat = await this.findOne(id);
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.ownerId !== userId) throw new ForbiddenException('Not owner');
    Object.assign(chat, dto);
    return this.chatRepo.save(chat);
  }

  async remove(id: string, userId: string): Promise<void> {
    const chat = await this.findOne(id);
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.ownerId !== userId) throw new ForbiddenException('Not owner');
    await this.chatRepo.delete(id);
  }
}
