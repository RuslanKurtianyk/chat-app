import { Module } from '@nestjs/common';
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
import { User } from './users/entities/user.entity';
import { Chat } from './chats/entities/chat.entity';
import { ChatMember } from './chats/entities/chat-member.entity';
import { Message } from './messages/entities/message.entity';
import { Call } from './calls/entities/call.entity';
import { Story } from './stories/entities/story.entity';
import { Folder } from './folders/entities/folder.entity';
import { FolderChat } from './folders/entities/folder-chat.entity';
import { LocationPoint } from './geolocation/entities/location-point.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/chat.sqlite',
      entities: [
        User,
        Chat,
        ChatMember,
        Message,
        Call,
        Story,
        Folder,
        FolderChat,
        LocationPoint,
      ],
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    ChatsModule,
    MessagesModule,
    CallsModule,
    StoriesModule,
    FoldersModule,
    GeolocationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
