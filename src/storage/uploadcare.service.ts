import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

/**
 * Uploadcare: клієнт завантажує файли напряму (Widget / REST) з public key;
 * бекенд може видати secure signature для обмеження завантажень.
 * @see https://uploadcare.com/docs/security/secure-uploads/
 */
@Injectable()
export class UploadcareService {
  constructor(private readonly config: ConfigService) {}

  get publicKey(): string {
    return this.config.get<string>('uploadcare.publicKey') || '';
  }

  get secretKey(): string {
    return this.config.get<string>('uploadcare.secretKey') || '';
  }

  get useSignedUpload(): boolean {
    return this.config.get<boolean>('uploadcare.useSignedUpload') === true;
  }

  isConfigured(): boolean {
    return Boolean(this.publicKey);
  }

  /** Дані для клієнта (без секрету). */
  getClientConfig() {
    return {
      publicKey: this.publicKey,
      cdnBase: 'https://ucarecdn.com',
    };
  }

  /**
   * Secure upload: підпис для поля `signature` у multipart-запиті на Uploadcare.
   * expire — Unix timestamp (секунди), коли підпис перестає діяти.
   */
  createSecureUploadSignature(expire: number): { expire: number; signature: string } | null {
    const secret = this.secretKey;
    if (!secret) return null;
    const signature = createHmac('sha256', secret)
      .update(String(expire))
      .digest('hex');
    return { expire, signature };
  }

  /**
   * Завантаження файлу на Uploadcare з бекенду (Direct upload).
   * @see https://uploadcare.com/docs/uploading-files/
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType?: string,
  ): Promise<{ uuid: string; cdnUrl: string }> {
    if (!this.publicKey) {
      throw new BadRequestException(
        'Uploadcare не налаштовано: задайте UPLOADCARE_PUBLIC_KEY',
      );
    }

    const form = new FormData();
    form.append('pub_key', this.publicKey);

    if (this.useSignedUpload && this.secretKey) {
      const sig = this.createSecureUploadSignature(
        Math.floor(Date.now() / 1000) + 600,
      );
      if (sig) {
        form.append('signature', sig.signature);
        form.append('expire', String(sig.expire));
      }
    }

    const blob = new Blob([new Uint8Array(buffer)], {
      type: contentType || 'application/octet-stream',
    });
    form.append('file', blob, filename || 'file');

    const res = await fetch('https://upload.uploadcare.com/base/', {
      method: 'POST',
      body: form,
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new BadRequestException(
        `Uploadcare: помилка завантаження (${res.status}): ${raw.slice(0, 500)}`,
      );
    }

    let data: { file?: string };
    try {
      data = JSON.parse(raw) as { file?: string };
    } catch {
      throw new BadRequestException('Uploadcare: некоректна відповідь');
    }

    const uuid = data.file;
    if (!uuid || typeof uuid !== 'string') {
      throw new BadRequestException('Uploadcare: у відповіді немає file id');
    }

    return {
      uuid,
      cdnUrl: `https://ucarecdn.com/${uuid}/`,
    };
  }
}
