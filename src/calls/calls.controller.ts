import { Controller, Get, Post, Param, Headers, Body } from '@nestjs/common';
import { CallsService } from './calls.service';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  async create(
    @Headers('x-user-id') userId: string,
    @Body() body: { chatId: string },
  ) {
    const chatId = body?.chatId;
    if (!userId || !chatId)
      return { error: 'Missing X-User-Id or body.chatId' };
    return this.callsService.create(chatId, userId);
  }

  @Get('chat/:chatId')
  async findByChat(@Param('chatId') chatId: string) {
    return this.callsService.findByChat(chatId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.callsService.findOne(id);
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.callsService.start(id);
  }

  @Post(':id/end')
  end(@Param('id') id: string) {
    return this.callsService.end(id);
  }
}
