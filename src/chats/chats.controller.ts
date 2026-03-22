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
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

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
