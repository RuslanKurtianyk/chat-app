import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  if (!process.env.DATABASE_URL?.trim()) {
    const dataDir = join(__dirname, '..', 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useStaticAssets(join(__dirname, '..', 'client'));

  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  if (corsOrigin) {
    const origins = corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
    app.enableCors({
      origin: origins.length === 1 ? origins[0] : origins,
      credentials: true,
    });
  } else {
    app.enableCors();
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
