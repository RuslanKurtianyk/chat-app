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
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

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
