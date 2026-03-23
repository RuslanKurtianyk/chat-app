import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { forwardRef, Inject } from '@nestjs/common';
import { Server } from 'socket.io';
import { MessagesService } from './messages.service';
import { ChatsService } from '../chats/chats.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
    private readonly chatsService: ChatsService,
  ) {}

  handleConnection(client: any) {
    const userId = client.handshake?.query?.userId;
    if (userId) client.data = { userId };
  }

  handleDisconnect() {}

  /** Розсилка після збереження (HTTP upload / POST messages / WS). */
  broadcastMessageCreated(chatId: string, msg: unknown) {
    this.server.to(`chat:${chatId}`).emit('messageCreated', msg);
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    client: any,
    @MessageBody() payload: { chatId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.chatId) return;
    try {
      await this.chatsService.join(payload.chatId, userId);
      client.join(`chat:${payload.chatId}`);
      return { joined: true };
    } catch {
      return { error: 'Join failed' };
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    client: any,
    @MessageBody()
    payload: { chatId: string; content?: string; replyToId?: string },
  ) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    if (!payload?.chatId) return { error: 'chatId required' };
    try {
      const msg = await this.messagesService.create(userId, {
        chatId: payload.chatId,
        content: payload.content ?? '',
        replyToId: payload.replyToId,
      });
      return msg;
    } catch (e: any) {
      return { error: e.message || 'Send failed' };
    }
  }

  /**
   * Файл як base64 (обмежений розмір). Для великих файлів використовуйте POST /messages/upload.
   */
  @SubscribeMessage('sendMessageWithFile')
  async sendMessageWithFile(
    client: any,
    @MessageBody()
    payload: {
      chatId: string;
      base64: string;
      fileName?: string;
      mimeType?: string;
      content?: string;
      replyToId?: string;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    if (!payload?.chatId || !payload?.base64) {
      return { error: 'chatId and base64 required' };
    }
    const maxWs = Number(process.env.WS_MAX_FILE_BYTES || 2 * 1024 * 1024);
    let size: number;
    try {
      size = Buffer.byteLength(payload.base64, 'base64');
    } catch {
      return { error: 'Invalid base64' };
    }
    if (size > maxWs) {
      return {
        error: `File too large for WebSocket (max ${maxWs} B). Use POST /messages/upload.`,
      };
    }
    try {
      return await this.messagesService.createWithBase64File(
        userId,
        payload.chatId,
        payload.base64,
        payload.fileName || 'file',
        payload.mimeType || 'application/octet-stream',
        payload.content,
        payload.replyToId,
      );
    } catch (e: any) {
      return { error: e.message || 'Send failed' };
    }
  }

  @SubscribeMessage('typingStart')
  async typingStart(
    client: any,
    @MessageBody() payload: { chatId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.chatId) return;
    client.to(`chat:${payload.chatId}`).emit('userTyping', {
      userId,
      chatId: payload.chatId,
      typing: true,
    });
  }

  @SubscribeMessage('typingStop')
  async typingStop(
    client: any,
    @MessageBody() payload: { chatId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.chatId) return;
    client.to(`chat:${payload.chatId}`).emit('userTyping', {
      userId,
      chatId: payload.chatId,
      typing: false,
    });
  }

  @SubscribeMessage('getMessages')
  async getMessages(client: any, @MessageBody() payload: { chatId: string }) {
    if (!payload?.chatId) return [];
    return this.messagesService.findByChat(payload.chatId);
  }
}
