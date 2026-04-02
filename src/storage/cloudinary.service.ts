import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import path from 'path';
import { promises as fs } from 'node:fs';

@Injectable()
export class CloudinaryService {
  private readonly folder: string;
  private readonly localUploadsEnabled: boolean;
  private readonly localUploadDir: string;
  private readonly localUploadPublicUrlPrefix: string;
  private readonly localUploadRouteBasePath: string;

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
    this.localUploadsEnabled =
      this.config.get<boolean>('cloudinary.localUploadsEnabled') ?? false;
    this.localUploadDir =
      this.config.get<string>('cloudinary.localUploadDir') || 'data/uploads';
    this.localUploadPublicUrlPrefix =
      this.config.get<string>('cloudinary.localUploadPublicUrlPrefix') || '';
    this.localUploadRouteBasePath =
      this.config.get<string>('cloudinary.localUploadRouteBasePath') ||
      '/storage/local';
  }

  isConfigured(): boolean {
    const cloudName = this.config.get<string>('cloudinary.cloudName') || '';
    const apiKey = this.config.get<string>('cloudinary.apiKey') || '';
    const apiSecret = this.config.get<string>('cloudinary.apiSecret') || '';
    return Boolean(cloudName && apiKey && apiSecret);
  }

  getClientConfig() {
    const cloudName = this.config.get<string>('cloudinary.cloudName') || '';
    const uploadPreset =
      this.config.get<string>('cloudinary.uploadPreset') || '';
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
      if (!this.localUploadsEnabled) {
        throw new BadRequestException(
          'Cloudinary не налаштовано: задайте CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET або увімкніть LOCAL_UPLOADS_ENABLED=true',
        );
      }

      const subfolderRaw = opts?.subfolder ?? '';
      const safeSubfolder =
        String(subfolderRaw)
          .replace(/[\\/]+/g, '_')
          .trim() || 'general';

      const originalBase = path.basename(
        filename || 'file',
        path.extname(filename || 'file'),
      );
      const safeBase =
        originalBase.replace(/[^\w-]+/g, '_').slice(0, 120) || 'file';
      const ext = path.extname(filename || '') || '';
      const unique = `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
      const outFilename = `${safeBase}_${unique}${ext}`;

      // Store: <localUploadDir>/<cloudinary.folder>/<subfolder>/<file>
      const outDirAbs = path.resolve(
        process.cwd(),
        this.localUploadDir,
        this.folder,
        safeSubfolder,
      );
      await fs.mkdir(outDirAbs, { recursive: true });
      const outFileAbs = path.join(outDirAbs, outFilename);
      await fs.writeFile(outFileAbs, buffer);

      const relUrl = `${this.localUploadRouteBasePath}/${encodeURIComponent(this.folder)}/${encodeURIComponent(
        safeSubfolder,
      )}/${encodeURIComponent(outFilename)}`;
      const prefix = this.localUploadPublicUrlPrefix.trim();
      return { secureUrl: prefix ? `${prefix}${relUrl}` : relUrl };
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
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (err, res) => {
          if (err) {
            const reason: Error =
              err instanceof Error
                ? err
                : new Error('Cloudinary upload failed');
            return reject(reason);
          }
          if (!res?.secure_url) {
            return reject(
              new BadRequestException(
                'Cloudinary: немає secure_url у відповіді',
              ),
            );
          }
          resolve({ secureUrl: res.secure_url });
        },
      );

      // Відправляємо Buffer як потік
      const readable = Readable.from(buffer);
      readable.on('error', (e) => {
        const reason: Error =
          e instanceof Error ? e : new Error('Local upload stream failed');
        reject(reason);
      });
      readable.pipe(stream);
    });
  }
}
