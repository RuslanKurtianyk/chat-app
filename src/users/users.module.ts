import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PresenceGateway } from './presence.gateway';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StorageModule],
  controllers: [UsersController],
  providers: [UsersService, PresenceGateway],
  exports: [UsersService],
})
export class UsersModule {}
