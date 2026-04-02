import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { ChatsService } from '../chats/chats.service';
import { toMessageWire } from './message.wire';

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
    private readonly chatsService: ChatsService,
  ) {}

  handleConnection(client: Socket) {
    const raw = client.handshake?.query?.userId;
    const userId = Array.isArray(raw) ? raw[0] : raw;
    if (userId) client.data = { userId: String(userId) };
  }

  handleDisconnect() {}

  /** Розсилка після збереження (HTTP upload / POST messages / WS). */
  broadcastMessageCreated(chatId: string, msg: unknown) {
    this.server.to(`chat:${chatId}`).emit('messageCreated', msg);
  }

  broadcastMessagesRead(
    chatId: string,
    receipts: { messageId: string; userId: string; readAt: string }[],
  ) {
    if (!receipts.length) return;
    this.server.to(`chat:${chatId}`).emit('messagesRead', { chatId, receipts });
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
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
    @ConnectedSocket() client: Socket,
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
      this.logger.warn(`sendMessage failed: ${e?.message || e}`);
      return { error: e?.message || e?.toString?.() || 'Send failed' };
    }
  }

  /**
   * Файл як base64 (обмежений розмір). Для великих файлів використовуйте POST /messages/upload.
   */
  @SubscribeMessage('sendMessageWithFile')
  async sendMessageWithFile(
    @ConnectedSocket() client: Socket,
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
      this.logger.warn(`sendMessageWithFile failed: ${e?.message || e}`);
      return { error: e?.message || e?.toString?.() || 'Send failed' };
    }
  }

  @SubscribeMessage('typingStart')
  async typingStart(
    @ConnectedSocket() client: Socket,
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
    @ConnectedSocket() client: Socket,
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
  async getMessages(
    @ConnectedSocket() _client: Socket,
    @MessageBody() payload: { chatId: string; limit?: number; cursor?: string },
  ) {
    if (!payload?.chatId) return [];
    if (payload.limit || payload.cursor) {
      return this.messagesService.findByChatPage({
        chatId: payload.chatId,
        limit: payload.limit,
        cursor: payload.cursor,
      });
    }
    return this.messagesService.findByChat(payload.chatId);
  }

  @SubscribeMessage('markMessagesRead')
  async markMessagesRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string; messageIds: string[] },
  ) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    if (!payload?.chatId || !payload?.messageIds?.length) {
      return { error: 'chatId and messageIds required' };
    }
    try {
      return await this.messagesService.markMessagesRead(userId, {
        chatId: payload.chatId,
        messageIds: payload.messageIds,
      });
    } catch (e: any) {
      return { error: e?.message || 'mark read failed' };
    }
  }
}
