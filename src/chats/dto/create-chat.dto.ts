import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreateChatDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  /** Optional group cover image URL (only meaningful when isGroup is true). */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  imageUrl?: string | null;
}
