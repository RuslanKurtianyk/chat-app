import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { ServerOptions } from 'socket.io';
import { getSocketIoCorsOptions } from './cors-settings';

export class AppSocketIoAdapter extends IoAdapter {
  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const cors = getSocketIoCorsOptions();
    const merged: ServerOptions = {
      ...options,
      cors,
    };
    return super.createIOServer(port, merged);
  }
}
