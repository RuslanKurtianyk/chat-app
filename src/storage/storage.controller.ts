import { Controller, Get, Query } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

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
      hint: 'Send files to POST /messages/upload; server uploads to Cloudinary and saves attachmentUrl in the message.',
      expire: expireStr || null,
    };
  }
}
