import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

const chatImageMax = Number(process.env.UPLOAD_MAX_FILE_BYTES || 25 * 1024 * 1024);

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  async create(
    @Headers('x-user-id') userId: string,
    @Body() createChatDto: CreateChatDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.chatsService.create(userId, createChatDto);
  }

  @Get()
  async myChats(@Headers('x-user-id') userId: string) {
    if (!userId) return this.chatsService.findAll();
    return this.chatsService.findMyChats(userId);
  }

  @Get('public')
  async searchPublic(@Query('search') search?: string) {
    return this.chatsService.findPublic(search);
  }

  @Post(':id/join')
  async join(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.chatsService.join(id, userId);
  }

  @Post(':id/leave')
  async leave(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.chatsService.leave(id, userId);
  }

  /** Group chat cover image (multipart field `file`). Owner only. */
  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: chatImageMax },
    }),
  )
  async uploadGroupImage(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: chatImageMax }),
          new FileTypeValidator({
            fileType: new RegExp('^image/(jpeg|jpg|png|gif|webp|svg\\+xml)$', 'i'),
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.chatsService.setGroupImageFromUpload(id, userId, file);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Body() updateChatDto: UpdateChatDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.chatsService.update(id, userId, updateChatDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.chatsService.remove(id, userId);
  }
}
