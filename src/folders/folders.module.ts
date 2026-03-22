import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { FoldersGateway } from './folders.gateway';
import { Folder } from './entities/folder.entity';
import { FolderChat } from './entities/folder-chat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Folder, FolderChat]),
  ],
  controllers: [FoldersController],
  providers: [FoldersService, FoldersGateway],
  exports: [FoldersService],
})
export class FoldersModule {}
