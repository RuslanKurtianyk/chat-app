import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { FoldersService } from './folders.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class FoldersGateway {
  constructor(private readonly foldersService: FoldersService) {}

  @SubscribeMessage('createFolder')
  async createFolder(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { name: string },
  ) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    return this.foldersService.create(userId, payload?.name ?? 'Folder');
  }

  @SubscribeMessage('myFolders')
  async myFolders(@ConnectedSocket() client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    return this.foldersService.findByUser(userId);
  }

  @SubscribeMessage('addChatToFolder')
  async addChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { folderId: string; chatId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.folderId || !payload?.chatId)
      return { error: 'userId, folderId, chatId required' };
    return this.foldersService.addChat(payload.folderId, payload.chatId, userId);
  }

  @SubscribeMessage('removeChatFromFolder')
  async removeChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { folderId: string; chatId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.folderId || !payload?.chatId) return;
    return this.foldersService.removeChat(
      payload.folderId,
      payload.chatId,
      userId,
    );
  }
}
