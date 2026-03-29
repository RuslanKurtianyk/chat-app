import {
  Controller,
  Get,
  Post,
  Query,
  Headers,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from './cloudinary.service';
import { UploadImageDto } from './dto/upload-image.dto';
import type { Express } from 'express';

const uploadMax = Number(process.env.UPLOAD_MAX_FILE_BYTES || 25 * 1024 * 1024);

const kindToSubfolder: Record<string, string> = {
  general: 'uploads',
  profile: 'profiles',
  message: 'messages',
  story: 'stories',
};

@Controller('storage')
export class StorageController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  /** Конфіг Cloudinary для фронтенду / клієнта (опц.). */
  @Get('cloudinary')
  cloudinaryConfig() {
    return this.cloudinary.getClientConfig();
  }

  /**
   * Legacy route for older frontend code.
   * Uploadcare replaced by Cloudinary.
   */
  @Get('uploadcare')
  uploadcareLegacy() {
    return {
      configured: false,
      message: 'Uploadcare replaced by Cloudinary. Use GET /storage/cloudinary.',
    };
  }

  /**
   * Legacy route for older frontend code.
   */
  @Get('uploadcare/signed-upload')
  signedUpload(@Query('expire') expireStr?: string) {
    return {
      error: 'signed uploads are not supported in this version (Cloudinary server uploads via POST /messages/upload)',
      hint: 'Use POST /storage/upload for images (profile, etc.) or POST /messages/upload to attach to a message.',
      expire: expireStr || null,
    };
  }

  /**
   * Спільне завантаження зображень (профіль, сторіз, довільне).
   * multipart: поле `file` + опційно `kind` у тілі: general | profile | message | story.
   */
  @Post('upload')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: uploadMax },
    }),
  )
  async uploadImage(
    @Headers('x-user-id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: uploadMax }),
          new FileTypeValidator({
            fileType: new RegExp('^image/(jpeg|jpg|png|gif|webp|svg\\+xml)$', 'i'),
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadImageDto,
  ) {
    if (!userId) throw new BadRequestException('Missing X-User-Id');
    const kind = body?.kind || 'general';
    const subfolder = kindToSubfolder[kind] ?? kindToSubfolder.general;
    const { secureUrl } = await this.cloudinary.uploadBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      { subfolder },
    );
    return {
      url: secureUrl,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
      kind,
    };
  }
}
