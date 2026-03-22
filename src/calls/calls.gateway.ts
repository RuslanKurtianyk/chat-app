import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { CallsService } from './calls.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class CallsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly callsService: CallsService) {}

  @SubscribeMessage('startCall')
  async startCall(
    client: any,
    @MessageBody() payload: { chatId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.chatId) return { error: 'userId and chatId required' };
    const call = await this.callsService.create(payload.chatId, userId);
    client.server?.to(`chat:${payload.chatId}`).emit('callStarted', call);
    return call;
  }

  @SubscribeMessage('endCall')
  async endCall(client: any, @MessageBody() payload: { callId: string }) {
    if (!payload?.callId) return { error: 'callId required' };
    const call = await this.callsService.end(payload.callId);
    this.server.emit('callEnded', call);
    return call;
  }

  @SubscribeMessage('callSignal')
  async callSignal(
    client: any,
    @MessageBody() payload: { callId: string; signal: any },
  ) {
    this.server.emit('callSignal', payload);
    return { ok: true };
  }
}
