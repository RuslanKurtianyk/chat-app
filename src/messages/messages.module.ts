import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { Message } from './entities/message.entity';
import { MessageRead } from './entities/message-read.entity';
import { ChatsModule } from '../chats/chats.module';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageRead]),
    ChatsModule,
    UsersModule,
    StorageModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesGateway, MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
