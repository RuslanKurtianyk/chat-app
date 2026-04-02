import { Message } from './entities/message.entity';

export type MessageReadEntry = { userId: string; readAt: string };

/** Безпечна для JSON / Socket.IO відповідь без TypeORM-метаданих і циклів. */
export function toMessageWire(m: Message, readBy: MessageReadEntry[] = []) {
  return {
    id: m.id,
    chatId: m.chatId,
    userId: m.userId,
    content: m.content,
    attachmentUrl: m.attachmentUrl,
    attachmentMimeType: m.attachmentMimeType,
    originalFilename: m.originalFilename,
    replyToId: m.replyToId,
    readBy,
    createdAt:
      m.createdAt instanceof Date
        ? m.createdAt.toISOString()
        : ((m.createdAt as unknown as string) ?? null),
  };
}
