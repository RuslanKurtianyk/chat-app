import { registerAs } from '@nestjs/config';

export default registerAs('cloudinary', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || '',
  apiKey: process.env.CLOUDINARY_API_KEY?.trim() || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || '',
  folder: process.env.CLOUDINARY_FOLDER?.trim() || 'chat-app',
  secure: process.env.CLOUDINARY_SECURE === 'false' ? false : true,
  // Unsigned preset is optional (only needed for client-side direct uploads)
  uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET?.trim() || '',

  // Local fallback for development (stores files on disk, serves them via GET /storage/local/*).
  localUploadsEnabled: process.env.LOCAL_UPLOADS_ENABLED === 'true',
  localUploadDir: process.env.LOCAL_UPLOAD_DIR?.trim() || 'data/uploads',
  // If set, returned URLs become absolute. Otherwise we return relative URLs.
  localUploadPublicUrlPrefix:
    process.env.LOCAL_UPLOAD_PUBLIC_URL_PREFIX?.trim() || '',
  localUploadRouteBasePath:
    process.env.LOCAL_UPLOAD_ROUTE_BASE_PATH?.trim() || '/storage/local',
}));
