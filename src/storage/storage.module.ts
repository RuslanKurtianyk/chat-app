import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cloudinaryConfig from '../config/cloudinary.config';
import { CloudinaryService } from './cloudinary.service';
import { StorageController } from './storage.controller';
import { LocalUploadsController } from './local-uploads.controller';

@Module({
  imports: [ConfigModule.forFeature(cloudinaryConfig)],
  controllers: [StorageController, LocalUploadsController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class StorageModule {}
