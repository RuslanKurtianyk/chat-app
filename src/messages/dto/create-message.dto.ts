import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  chatId: string;

  @IsString()
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;
}
