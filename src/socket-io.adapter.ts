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
    // Spread optional `options` widens e.g. `path` to `string | undefined`; assert for socket.io's ServerOptions.
    const merged = {
      ...options,
      cors,
    } as ServerOptions;
    return super.createIOServer(port, merged);
  }
}
