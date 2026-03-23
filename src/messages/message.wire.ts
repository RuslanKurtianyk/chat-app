import { Message } from './entities/message.entity';

/** Безпечна для JSON / Socket.IO відповідь без TypeORM-метаданих і циклів. */
export function toMessageWire(m: Message) {
  return {
    id: m.id,
    chatId: m.chatId,
    userId: m.userId,
    content: m.content,
    attachmentUrl: m.attachmentUrl,
    attachmentMimeType: m.attachmentMimeType,
    originalFilename: m.originalFilename,
    replyToId: m.replyToId,
    createdAt:
      m.createdAt instanceof Date
        ? m.createdAt.toISOString()
        : (m.createdAt as unknown as string) ?? null,
  };
}
