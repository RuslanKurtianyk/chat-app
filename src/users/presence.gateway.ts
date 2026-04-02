import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from './users.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly usersService: UsersService) {}

  async handleConnection(client: Socket) {
    const raw = client.handshake?.query?.userId;
    const userId = raw ? String(Array.isArray(raw) ? raw[0] : raw) : null;
    if (userId) {
      client.data = { userId };
      await this.usersService.updateLastActive(userId);
      this.server.emit('userOnline', { userId, at: new Date() });
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      this.server.emit('userOffline', { userId, at: new Date() });
    }
  }
}
