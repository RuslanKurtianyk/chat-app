import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async create(userId: string, dto: CreateMessageDto): Promise<Message> {
    const msg = this.messageRepo.create({
      chatId: dto.chatId,
      userId,
      content: dto.content,
      replyToId: dto.replyToId ?? null,
    });
    return this.messageRepo.save(msg);
  }

  async findAll(): Promise<Message[]> {
    return this.messageRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
      relations: ['user'],
    });
  }

  async findByChat(chatId: string, limit = 50): Promise<Message[]> {
    return this.messageRepo.find({
      where: { chatId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  async findOne(id: string): Promise<Message | null> {
    return this.messageRepo.findOne({
      where: { id },
      relations: ['user', 'chat'],
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateMessageDto,
  ): Promise<Message> {
    const msg = await this.messageRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.userId !== userId) throw new NotFoundException('Forbidden');
    if (dto.content !== undefined) msg.content = dto.content;
    return this.messageRepo.save(msg);
  }

  async remove(id: string, userId: string): Promise<void> {
    const msg = await this.messageRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.userId !== userId) throw new NotFoundException('Forbidden');
    await this.messageRepo.delete(id);
  }
}
