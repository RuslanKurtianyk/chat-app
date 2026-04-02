import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { Express } from 'express';
import { Chat } from '../chats/entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { Message } from './entities/message.entity';
import { MessageRead } from './entities/message-read.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MarkMessagesReadDto } from './dto/mark-messages-read.dto';
import { ChatsService } from '../chats/chats.service';
import { CloudinaryService } from '../storage/cloudinary.service';
import { UsersService } from '../users/users.service';
import { MessagesGateway } from './messages.gateway';
import { toMessageWire, type MessageReadEntry } from './message.wire';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageRead)
    private readonly readRepo: Repository<MessageRead>,
    private readonly chatsService: ChatsService,
    private readonly cloudinary: CloudinaryService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway: MessagesGateway,
  ) {}

  private async notifyNewMessage(chatId: string, msg: Message) {
    await this.usersService.updateLastActive(msg.userId);
    this.messagesGateway.broadcastMessageCreated(
      chatId,
      toMessageWire(msg, []),
    );
  }

  private async attachReads(
    messages: Message[],
  ): Promise<ReturnType<typeof toMessageWire>[]> {
    if (!messages.length) return [];
    const ids = messages.map((m) => m.id);
    const reads = await this.readRepo.find({
      where: { message: { id: In(ids) } },
      order: { readAt: 'ASC' },
    });
    const map = new Map<string, MessageReadEntry[]>();
    for (const r of reads) {
      const entry: MessageReadEntry = {
        userId: r.userId,
        readAt:
          r.readAt instanceof Date
            ? r.readAt.toISOString()
            : (r.readAt as unknown as string),
      };
      const list = map.get(r.messageId) ?? [];
      list.push(entry);
      map.set(r.messageId, list);
    }
    return messages.map((m) => toMessageWire(m, map.get(m.id) ?? []));
  }

  async markMessagesRead(
    userId: string,
    dto: MarkMessagesReadDto,
  ): Promise<{ marked: number }> {
    const member = await this.chatsService.isMember(dto.chatId, userId);
    if (!member) {
      throw new ForbiddenException('Ви не учасник цього чату');
    }
    const msgs = await this.messageRepo.find({
      where: { id: In(dto.messageIds), chat: { id: dto.chatId } },
      select: ['id'],
    });
    const valid = new Set(msgs.map((m) => m.id));
    const target = dto.messageIds.filter((id) => valid.has(id));
    if (!target.length) return { marked: 0 };

    const existing = await this.readRepo.find({
      where: {
        user: { id: userId },
        message: { id: In(target) },
      },
    });
    const done = new Set(existing.map((e) => e.messageId));
    const toInsert = target.filter((id) => !done.has(id));
    if (toInsert.length) {
      await this.readRepo.save(
        toInsert.map((mid) =>
          this.readRepo.create({
            message: { id: mid } as Message,
            user: { id: userId } as User,
          }),
        ),
      );
    }
    const nowIso = new Date().toISOString();
    this.messagesGateway.broadcastMessagesRead(
      dto.chatId,
      toInsert.map((messageId) => ({ messageId, userId, readAt: nowIso })),
    );
    return { marked: toInsert.length };
  }

  async markMessageRead(
    userId: string,
    messageId: string,
  ): Promise<ReturnType<typeof toMessageWire>> {
    const msg = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['chat'],
    });
    if (!msg) throw new NotFoundException('Message not found');

    const chatId = msg.chatId ?? msg.chat?.id;
    if (!chatId) throw new NotFoundException('Message chat not found');

    const member = await this.chatsService.isMember(chatId, userId);
    if (!member) throw new ForbiddenException('Ви не учасник цього чату');

    const existing = await this.readRepo.findOne({
      where: {
        user: { id: userId },
        message: { id: messageId },
      },
    });

    if (!existing) {
      await this.readRepo.save(
        this.readRepo.create({
          message: { id: messageId } as Message,
          user: { id: userId } as User,
          readAt: new Date(),
        }),
      );
    }

    const [wired] = await this.attachReads([msg]);
    if (!wired) throw new NotFoundException('Message not found');
    return wired;
  }

  async create(
    userId: string,
    dto: CreateMessageDto,
  ): Promise<ReturnType<typeof toMessageWire>> {
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
    return toMessageWire(saved, []);
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
  ): Promise<ReturnType<typeof toMessageWire>> {
    const member = await this.chatsService.isMember(chatId, userId);
    if (!member) {
      throw new ForbiddenException('Ви не учасник цього чату');
    }

    const { secureUrl } = await this.cloudinary.uploadBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      { subfolder: 'messages' },
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
    return toMessageWire(saved, []);
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
  ): Promise<ReturnType<typeof toMessageWire>> {
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

  async findAll(): Promise<ReturnType<typeof toMessageWire>[]> {
    const messages = await this.messageRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
      relations: ['user'],
    });
    return this.attachReads(messages);
  }

  async findByChat(
    chatId: string,
    limit = 50,
  ): Promise<ReturnType<typeof toMessageWire>[]> {
    const messages = await this.messageRepo.find({
      where: { chat: { id: chatId } },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });
    return this.attachReads(messages);
  }

  async findByChatPage(params: {
    chatId: string;
    limit?: number;
    cursor?: string; // messageId
  }): Promise<{
    items: ReturnType<typeof toMessageWire>[];
    nextCursor: string | null;
  }> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);

    let cursorCreatedAt: Date | null = null;
    let cursorId: string | null = null;
    if (params.cursor) {
      const c = await this.messageRepo.findOne({
        where: { id: params.cursor, chat: { id: params.chatId } },
        select: ['id', 'createdAt'],
      });
      if (c) {
        cursorCreatedAt =
          c.createdAt instanceof Date
            ? c.createdAt
            : new Date(c.createdAt as any);
        cursorId = c.id;
      }
    }

    const qb = this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .where('m.chat_id = :chatId', { chatId: params.chatId })
      .orderBy('m.created_at', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(limit);

    if (cursorCreatedAt && cursorId) {
      qb.andWhere(
        '(m.created_at < :cAt OR (m.created_at = :cAt AND m.id < :cId))',
        { cAt: cursorCreatedAt, cId: cursorId },
      );
    }

    const messages = await qb.getMany();
    const items = await this.attachReads(messages);
    const nextCursor =
      messages.length === limit ? messages[messages.length - 1].id : null;
    return { items, nextCursor };
  }

  async findOne(id: string): Promise<ReturnType<typeof toMessageWire> | null> {
    const msg = await this.messageRepo.findOne({
      where: { id },
      relations: ['user', 'chat'],
    });
    if (!msg) return null;
    const [wired] = await this.attachReads([msg]);
    return wired;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateMessageDto,
  ): Promise<ReturnType<typeof toMessageWire>> {
    const msg = await this.messageRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.userId !== userId) throw new NotFoundException('Forbidden');
    if (dto.content !== undefined) msg.content = dto.content;
    const saved = await this.messageRepo.save(msg);
    const [wired] = await this.attachReads([saved]);
    return wired;
  }

  async remove(id: string, userId: string): Promise<void> {
    const msg = await this.messageRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.userId !== userId) throw new NotFoundException('Forbidden');
    await this.messageRepo.delete(id);
  }
}
