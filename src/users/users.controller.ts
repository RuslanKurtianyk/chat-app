import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const avatarMax = Number(process.env.UPLOAD_MAX_FILE_BYTES || 25 * 1024 * 1024);

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /** Профіль поточного користувача (X-User-Id) */
  @Get('me')
  async getProfile(@Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.usersService.findOne(userId);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /** Оновити профіль (ім’я, нікнейм, URL аватара) */
  @Patch('me')
  async updateProfile(@Headers('x-user-id') userId: string, @Body() dto: UpdateUserDto) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.usersService.update(userId, dto);
  }

  /** Завантажити зображення аватара; повертає оновлений профіль (як POST /storage/upload + PATCH, але одним кроком). */
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: avatarMax } }),
  )
  async uploadAvatar(
    @Headers('x-user-id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: avatarMax }),
          new FileTypeValidator({
            fileType: new RegExp('^image/(jpeg|jpg|png|gif|webp)$', 'i'),
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.usersService.setAvatarFromUpload(userId, file);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
