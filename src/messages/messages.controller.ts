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
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { UploadMessageFieldsDto } from './dto/upload-message.dto';
import { MarkMessagesReadDto } from './dto/mark-messages-read.dto';
import type { Express } from 'express';

const maxUploadBytes = Number(
  process.env.UPLOAD_MAX_FILE_BYTES || 25 * 1024 * 1024,
);

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * multipart/form-data: поле `file` + `chatId` (+ опційно `content`, `replyToId`).
   * Бекенд завантажує файл у Cloudinary і зберігає URL (secure_url) у повідомленні.
   */
  @Post('upload')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: maxUploadBytes },
    }),
  )
  async uploadAndCreateMessage(
    @Headers('x-user-id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: maxUploadBytes })],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadMessageFieldsDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    if (!body?.chatId) {
      throw new BadRequestException('chatId обовʼязковий у тілі форми');
    }
    return this.messagesService.createWithUploadedFile(
      userId,
      file,
      body.chatId,
      body.content,
      body.replyToId,
    );
  }

  @Post('read-receipts')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  markRead(
    @Headers('x-user-id') userId: string,
    @Body() dto: MarkMessagesReadDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.messagesService.markMessagesRead(userId, dto);
  }

  @Post(':id/read')
  async markOneRead(
    @Param('id') messageId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.messagesService.markMessageRead(userId, messageId);
  }

  @Post()
  async create(
    @Headers('x-user-id') userId: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.messagesService.create(userId, createMessageDto);
  }

  @Get()
  findAll(@Query('chatId') chatId?: string) {
    if (chatId) return this.messagesService.findByChat(chatId);
    return this.messagesService.findAll();
  }

  /** Пагінація (cursor = messageId). Повертає { items, nextCursor }. */
  @Get('page')
  page(
    @Query('chatId') chatId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    if (!chatId) return { error: 'chatId required' };
    return this.messagesService.findByChatPage({
      chatId,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.messagesService.update(id, userId, updateMessageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.messagesService.remove(id, userId);
  }
}
