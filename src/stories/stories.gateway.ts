import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { StoriesService } from './stories.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class StoriesGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly storiesService: StoriesService) {}

  @SubscribeMessage('createStory')
  async createStory(
    client: any,
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
  async getStories(client: any, @MessageBody() payload: { userId?: string }) {
    return this.storiesService.findActive(payload?.userId);
  }
}
