import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StoriesService } from './stories.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class StoriesGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly storiesService: StoriesService) {}

  @SubscribeMessage('createStory')
  async createStory(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { mediaUrl: string; caption?: string; expiresInHours?: number },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.mediaUrl) return { error: 'Identify and mediaUrl required' };
    const story = await this.storiesService.create(
      userId,
      payload.mediaUrl,
      payload.caption,
      payload.expiresInHours ?? 24,
    );
    this.server.emit('storyCreated', story);
    return story;
  }

  @SubscribeMessage('getStories')
  async getStories(
    @ConnectedSocket() _client: Socket,
    @MessageBody() payload: { userId?: string },
  ) {
    return this.storiesService.findActive(payload?.userId);
  }
}
