import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';

@Controller('admin/users')
@UseGuards(AdminApiKeyGuard)
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    const p = Math.max(parseInt(page || '1', 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
    return this.users.findAllPaged(p, l);
  }

  @Get(':id')
  async one(@Param('id', ParseUUIDPipe) id: string) {
    const u = await this.users.findOne(id);
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  /**
   * Block/ban a user account (admin action).
   * Body: { "reason"?: string }
   */
  @Post(':id/block')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async block(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    const u = await this.users.adminBlockUser(id, { reason: body?.reason });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  /** Unblock/unban a user account (admin action). */
  @Delete(':id/block')
  async unblock(@Param('id', ParseUUIDPipe) id: string) {
    const u = await this.users.adminUnblockUser(id);
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.users.remove(id);
  }
}
