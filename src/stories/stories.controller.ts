import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  Query,
} from '@nestjs/common';
import { StoriesService } from './stories.service';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  async create(
    @Headers('x-user-id') userId: string,
    @Body()
    body: { mediaUrl: string; caption?: string; expiresInHours?: number },
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    if (!body?.mediaUrl) return { error: 'mediaUrl required' };
    return this.storiesService.create(
      userId,
      body.mediaUrl,
      body.caption,
      body.expiresInHours ?? 24,
    );
  }

  @Get()
  findActive(@Query('userId') userId?: string) {
    return this.storiesService.findActive(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storiesService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.storiesService.remove(id, userId);
  }
}
