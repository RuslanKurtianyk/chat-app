import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ChatsModule } from './chats/chats.module';
import { MessagesModule } from './messages/messages.module';
import { AuthModule } from './auth/auth.module';
import { CallsModule } from './calls/calls.module';
import { StoriesModule } from './stories/stories.module';
import { FoldersModule } from './folders/folders.module';
import { GeolocationModule } from './geolocation/geolocation.module';
import { StorageModule } from './storage/storage.module';
import databaseConfig from './config/database.config';
import cloudinaryConfig from './config/cloudinary.config';
import { resolvePostgresToIpv4Host } from './config/postgres-ipv4-host';
import { User } from './users/entities/user.entity';
import { Chat } from './chats/entities/chat.entity';
import { ChatMember } from './chats/entities/chat-member.entity';
import { Message } from './messages/entities/message.entity';
import { MessageRead } from './messages/entities/message-read.entity';
import { Call } from './calls/entities/call.entity';
import { Story } from './stories/entities/story.entity';
import { Folder } from './folders/entities/folder.entity';
import { FolderChat } from './folders/entities/folder-chat.entity';
import { LocationPoint } from './geolocation/entities/location-point.entity';
import { Product } from './products/entities/product.entity';
import { WalletAccount } from './wallet/entities/wallet-account.entity';
import { WalletTransaction } from './wallet/entities/wallet-transaction.entity';
import { ProductsModule } from './products/products.module';
import { WalletModule } from './wallet/wallet.module';
import { WsModule } from './ws/ws.module';

const typeOrmEntities = [
  User,
  Chat,
  ChatMember,
  Message,
  MessageRead,
  Call,
  Story,
  Folder,
  FolderChat,
  LocationPoint,
  Product,
  WalletAccount,
  WalletTransaction,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, cloudinaryConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const db = config.get<{
          url: string | null;
          synchronize: boolean;
          ssl: boolean | { rejectUnauthorized: boolean } | undefined;
        }>('database');

        if (db?.url) {
          const pool = {
            max: Number(process.env.DATABASE_POOL_MAX || 10),
          };
          const resolved = await resolvePostgresToIpv4Host(db.url, db.ssl);
          if (resolved.mode === 'url') {
            return {
              type: 'postgres' as const,
              url: resolved.url,
              entities: typeOrmEntities,
              synchronize: db.synchronize,
              ssl: resolved.ssl,
              extra: pool,
            };
          }
          return {
            type: 'postgres' as const,
            host: resolved.host,
            port: resolved.port,
            username: resolved.username,
            password: resolved.password,
            database: resolved.database,
            entities: typeOrmEntities,
            synchronize: db.synchronize,
            ssl: resolved.ssl,
            extra: pool,
          };
        }

        return {
          type: 'better-sqlite3' as const,
          database: 'data/chat.sqlite',
          entities: typeOrmEntities,
          synchronize: true,
        };
      },
    }),
    UsersModule,
    AuthModule,
    ChatsModule,
    MessagesModule,
    CallsModule,
    StoriesModule,
    FoldersModule,
    GeolocationModule,
    StorageModule,
    ProductsModule,
    WalletModule,
    WsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
