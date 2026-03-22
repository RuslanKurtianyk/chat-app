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
}
