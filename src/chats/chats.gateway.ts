import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatsService } from './chats.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatsService: ChatsService) {}

  handleConnection(client: Socket) {
    const raw = client.handshake?.query?.userId;
    const userId = Array.isArray(raw) ? raw[0] : raw;
    if (userId) client.data = { userId: String(userId) };
  }

  handleDisconnect() {}

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
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
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.chatId) return;
    await this.chatsService.leave(payload.chatId, userId);
    client.leave(`chat:${payload.chatId}`);
    return { left: true };
  }

  @SubscribeMessage('myChats')
  async myChats(@ConnectedSocket() client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    return this.chatsService.findMyChats(userId);
  }

  @SubscribeMessage('searchPublicChats')
  async searchPublic(
    @ConnectedSocket() _client: Socket,
    @MessageBody() payload: { search?: string },
  ) {
    return this.chatsService.findPublic(payload?.search);
  }

  @SubscribeMessage('createChat')
  async createChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: any,
  ) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    return this.chatsService.create(userId, {
      name: dto?.name ?? 'Chat',
      isPrivate: dto?.isPrivate,
      isGroup: dto?.isGroup,
    });
  }
}
