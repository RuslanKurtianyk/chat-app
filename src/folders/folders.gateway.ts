import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { FoldersService } from './folders.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class FoldersGateway {
  constructor(private readonly foldersService: FoldersService) {}

  @SubscribeMessage('createFolder')
  async createFolder(client: any, @MessageBody() payload: { name: string }) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    return this.foldersService.create(userId, payload?.name ?? 'Folder');
  }

  @SubscribeMessage('myFolders')
  async myFolders(client: any) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    return this.foldersService.findByUser(userId);
  }

  @SubscribeMessage('addChatToFolder')
  async addChat(
    client: any,
    @MessageBody() payload: { folderId: string; chatId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.folderId || !payload?.chatId)
      return { error: 'userId, folderId, chatId required' };
    return this.foldersService.addChat(payload.folderId, payload.chatId, userId);
  }

  @SubscribeMessage('removeChatFromFolder')
  async removeChat(
    client: any,
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
