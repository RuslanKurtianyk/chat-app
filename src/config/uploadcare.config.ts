import { registerAs } from '@nestjs/config';

export default registerAs('uploadcare', () => ({
  publicKey: process.env.UPLOADCARE_PUBLIC_KEY?.trim() || '',
  secretKey: process.env.UPLOADCARE_SECRET_KEY?.trim() || '',
  /** Якщо true і задано secret — додаємо signature/expire до direct upload */
  useSignedUpload: process.env.UPLOADCARE_USE_SIGNED_UPLOAD === 'true',
}));
