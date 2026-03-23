import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cloudinaryConfig from '../config/cloudinary.config';
import { CloudinaryService } from './cloudinary.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [ConfigModule.forFeature(cloudinaryConfig)],
  controllers: [StorageController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class StorageModule {}
