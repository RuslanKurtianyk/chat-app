import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GeolocationService } from './geolocation.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class GeolocationGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly geolocationService: GeolocationService) {}

  @SubscribeMessage('shareLocation')
  async shareLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { lat: number; lng: number },
  ) {
    const userId = client.data?.userId;
    if (!userId || typeof payload?.lat !== 'number' || typeof payload?.lng !== 'number')
      return { error: 'Identify and lat, lng required' };
    const point = await this.geolocationService.shareLocation(
      userId,
      payload.lat,
      payload.lng,
    );
    this.server.emit('locationShared', point);
    return point;
  }

  @SubscribeMessage('getTodayRoute')
  async getTodayRoute(@ConnectedSocket() client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Identify with query userId' };
    return this.geolocationService.getTodayRoute(userId);
  }
}
