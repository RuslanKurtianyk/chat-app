import dns from 'node:dns';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Render та інші хости часто без IPv6: Supabase DNS дає AAAA → connect ENETUNREACH.
// Пріоритет A-запису (IPv4) виправляє це. Вимкнути: DATABASE_DNS_IPV4_FIRST=false
if (process.env.DATABASE_DNS_IPV4_FIRST !== 'false') {
  dns.setDefaultResultOrder('ipv4first');
}
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppSocketIoAdapter } from './socket-io.adapter';
import { getCorsMode } from './cors-settings';

async function bootstrap() {
  if (!process.env.DATABASE_URL?.trim()) {
    const dataDir = join(__dirname, '..', 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useWebSocketAdapter(new AppSocketIoAdapter(app));
  app.useStaticAssets(join(__dirname, '..', 'client'));

  // OpenAPI/Swagger docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Chat App API')
    .setDescription('Use header `X-User-Id` for authenticated endpoints.')
    .setVersion('0.0.1')
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDoc, {
    // keeps UI working with static hosting behind Render
    swaggerOptions: { persistAuthorization: true },
  });

  const corsMode = getCorsMode();
  if (corsMode.mode === 'permissive') {
    app.enableCors();
  } else {
    app.enableCors({
      origin: corsMode.origin,
      credentials: corsMode.credentials,
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
