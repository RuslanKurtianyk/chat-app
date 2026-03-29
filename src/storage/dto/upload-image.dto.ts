import { IsIn, IsOptional, IsString } from 'class-validator';

/** Підкаталог у Cloudinary (`folder` з env / kind). */
export class UploadImageDto {
  @IsOptional()
  @IsString()
  @IsIn(['general', 'profile', 'message', 'story'])
  kind?: string;
}
