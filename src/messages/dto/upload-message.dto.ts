import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Поля multipart (крім файлу) для POST /messages/upload */
export class UploadMessageFieldsDto {
  @IsUUID()
  chatId: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;
}
