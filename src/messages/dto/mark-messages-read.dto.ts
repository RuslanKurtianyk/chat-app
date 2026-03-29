import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class MarkMessagesReadDto {
  @IsUUID()
  chatId: string;

  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  messageIds: string[];
}
