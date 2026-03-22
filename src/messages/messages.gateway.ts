import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { MessagesService } from './messages.service';
import { ChatsService } from '../chats/chats.service';
import { UsersService } from '../users/users.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messagesService: MessagesService,
    private readonly chatsService: ChatsService,
    private readonly usersService: UsersService,
  ) {}

  handleConnection(client: any) {
    const userId = client.handshake?.query?.userId;
    if (userId) client.data = { userId };
  }

  handleDisconnect() {}

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
      await this.usersService.updateLastActive(userId);
      const msg = await this.messagesService.create(userId, {
        chatId: payload.chatId,
        content: payload.content ?? '',
        replyToId: payload.replyToId,
      });
      this.server.to(`chat:${payload.chatId}`).emit('messageCreated', msg);
      return msg;
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
