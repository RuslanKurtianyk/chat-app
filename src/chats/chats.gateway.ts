import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ChatsService } from './chats.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatsService: ChatsService) {}

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
    if (!userId) return { error: 'Identify with query userId' };
    if (!payload?.chatId) return { error: 'chatId required' };
    try {
      await this.chatsService.join(payload.chatId, userId);
      client.join(`chat:${payload.chatId}`);
      return { joined: true, chatId: payload.chatId };
    } catch (e: any) {
      return { error: e.message || 'Join failed' };
    }
  }

  @SubscribeMessage('leaveChat')
  async handleLeaveChat(
    client: any,
    @MessageBody() payload: { chatId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.chatId) return;
    await this.chatsService.leave(payload.chatId, userId);
    client.leave(`chat:${payload.chatId}`);
    return { left: true };
  }

  @SubscribeMessage('myChats')
  async myChats(client: any) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    return this.chatsService.findMyChats(userId);
  }

  @SubscribeMessage('searchPublicChats')
  async searchPublic(client: any, @MessageBody() payload: { search?: string }) {
    return this.chatsService.findPublic(payload?.search);
  }

  @SubscribeMessage('createChat')
  async createChat(client: any, @MessageBody() dto: any) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    return this.chatsService.create(userId, {
      name: dto?.name ?? 'Chat',
      isPrivate: dto?.isPrivate,
      isGroup: dto?.isGroup,
    });
  }
}
