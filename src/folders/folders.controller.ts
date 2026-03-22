import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
} from '@nestjs/common';
import { FoldersService } from './folders.service';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  async create(
    @Headers('x-user-id') userId: string,
    @Body() body: { name: string },
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.foldersService.create(userId, body?.name ?? 'Folder');
  }

  @Get()
  myFolders(@Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.foldersService.findByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.foldersService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { name: string },
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.foldersService.update(id, userId, body?.name ?? '');
  }

  @Post(':id/chats/:chatId')
  addChat(
    @Param('id') folderId: string,
    @Param('chatId') chatId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.foldersService.addChat(folderId, chatId, userId);
  }

  @Delete(':id/chats/:chatId')
  removeChat(
    @Param('id') folderId: string,
    @Param('chatId') chatId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.foldersService.removeChat(folderId, chatId, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.foldersService.remove(id, userId);
  }
}
