import { registerAs } from '@nestjs/config';

export default registerAs('cloudinary', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || '',
  apiKey: process.env.CLOUDINARY_API_KEY?.trim() || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || '',
  folder: process.env.CLOUDINARY_FOLDER?.trim() || 'chat-app',
  secure: process.env.CLOUDINARY_SECURE === 'false' ? false : true,
  // Unsigned preset is optional (only needed for client-side direct uploads)
  uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET?.trim() || '',
}));

