import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import path from 'path';

@Injectable()
export class CloudinaryService {
  private readonly folder: string;

  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>('cloudinary.cloudName') || '';
    const apiKey = this.config.get<string>('cloudinary.apiKey') || '';
    const apiSecret = this.config.get<string>('cloudinary.apiSecret') || '';

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: this.config.get<boolean>('cloudinary.secure') ?? true,
      });
    }

    this.folder = this.config.get<string>('cloudinary.folder') || 'chat-app';
  }

  isConfigured(): boolean {
    const cloudName = this.config.get<string>('cloudinary.cloudName') || '';
    const apiKey = this.config.get<string>('cloudinary.apiKey') || '';
    const apiSecret = this.config.get<string>('cloudinary.apiSecret') || '';
    return Boolean(cloudName && apiKey && apiSecret);
  }

  getClientConfig() {
    const cloudName = this.config.get<string>('cloudinary.cloudName') || '';
    const uploadPreset = this.config.get<string>('cloudinary.uploadPreset') || '';
    return {
      configured: this.isConfigured(),
      cloudName,
      folder: this.folder,
      // Для клієнта (якщо захочете direct upload). Зараз сервер сам завантажує.
      uploadPreset,
      secure: this.config.get<boolean>('cloudinary.secure') ?? true,
    };
  }

  /**
   * @param opts.subfolder — додатковий сегмент шляху в Cloudinary (напр. profile, messages).
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType?: string,
    opts?: { subfolder?: string },
  ): Promise<{ secureUrl: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Cloudinary не налаштовано: задайте CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
      );
    }

    const pathSuffix = opts?.subfolder?.replace(/^\/+|\/+$/g, '') || '';
    const folderPath = pathSuffix
      ? `${this.folder}/${pathSuffix}`.replace(/\/+/g, '/')
      : this.folder;

    const uploadOptions: Record<string, unknown> = {
      folder: folderPath,
      resource_type: 'auto',
      // Безпечний public_id, щоб не перезаписувати існуючі ресурси
      overwrite: false,
    };
    if (contentType) uploadOptions.quality = 'auto';

    if (filename) {
      const base = path.basename(filename, path.extname(filename));
      const safe = base.replace(/[^\w-]+/g, '_').slice(0, 120);
      uploadOptions.public_id = `${safe}_${Date.now()}_${Math.floor(
        Math.random() * 1_000_000,
      )}`;
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, res) => {
        if (err) return reject(err);
        if (!res?.secure_url) {
          return reject(
            new BadRequestException('Cloudinary: немає secure_url у відповіді'),
          );
        }
        resolve({ secureUrl: res.secure_url });
      });

      // Відправляємо Buffer як потік
      const readable = Readable.from(buffer);
      readable.on('error', reject);
      readable.pipe(stream);
    });
  }
}

