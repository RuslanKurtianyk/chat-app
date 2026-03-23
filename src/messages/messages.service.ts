import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Express } from 'express';
import { Chat } from '../chats/entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ChatsService } from '../chats/chats.service';
import { CloudinaryService } from '../storage/cloudinary.service';
import { UsersService } from '../users/users.service';
import { MessagesGateway } from './messages.gateway';
import { toMessageWire } from './message.wire';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly chatsService: ChatsService,
    private readonly cloudinary: CloudinaryService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway: MessagesGateway,
  ) {}

  private async notifyNewMessage(chatId: string, msg: Message) {
    await this.usersService.updateLastActive(msg.userId);
    this.messagesGateway.broadcastMessageCreated(chatId, toMessageWire(msg));
  }

  async create(userId: string, dto: CreateMessageDto): Promise<Message> {
    const member = await this.chatsService.isMember(dto.chatId, userId);
    if (!member) {
      throw new ForbiddenException('Ви не учасник цього чату');
    }
    const msg = this.messageRepo.create({
      chat: { id: dto.chatId } as Chat,
      user: { id: userId } as User,
      content: dto.content,
      replyToId: dto.replyToId ?? null,
      attachmentUrl: null,
      attachmentMimeType: null,
      originalFilename: null,
    });
    const saved = await this.messageRepo.save(msg);
    await this.notifyNewMessage(dto.chatId, saved);
    return saved;
  }

  /**
   * Клієнт надсилає файл на бекенд → Cloudinary → URL у повідомленні.
   */
  async createWithUploadedFile(
    userId: string,
    file: Express.Multer.File,
    chatId: string,
    content?: string,
    replyToId?: string,
  ): Promise<Message> {
    const member = await this.chatsService.isMember(chatId, userId);
    if (!member) {
      throw new ForbiddenException('Ви не учасник цього чату');
    }

    const { secureUrl } = await this.cloudinary.uploadBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    const msg = this.messageRepo.create({
      chat: { id: chatId } as Chat,
      user: { id: userId } as User,
      content: content?.trim() ?? '',
      replyToId: replyToId ?? null,
      attachmentUrl: secureUrl,
      attachmentMimeType: file.mimetype,
      originalFilename: file.originalname,
    });
    const saved = await this.messageRepo.save(msg);
    await this.notifyNewMessage(chatId, saved);
    return saved;
  }

  /** Для WebSocket: base64 → той самий пайплайн (обмежений розмір). */
  async createWithBase64File(
    userId: string,
    chatId: string,
    base64: string,
    fileName: string,
    mimeType: string,
    content?: string,
    replyToId?: string,
  ): Promise<Message> {
    const buffer = Buffer.from(base64, 'base64');
    const fakeFile = {
      buffer,
      originalname: fileName || 'file',
      mimetype: mimeType || 'application/octet-stream',
    } as Express.Multer.File;
    return this.createWithUploadedFile(
      userId,
      fakeFile,
      chatId,
      content,
      replyToId,
    );
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
