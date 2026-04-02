import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

type WsEventDirection = 'client->server' | 'server->client';

type WsEventDoc = {
  event: string;
  direction: WsEventDirection;
  description: string;
  payloadExample?: unknown;
  emitsTo?: string;
};

type WsApiDocs = {
  protocol: 'socket.io';
  handshake: {
    /**
     * В твоїх gateway `userId` читається з:
     *   client.handshake.query.userId
     */
    query: { userId: string };
  };
  clientToServer: WsEventDoc[];
  serverToClient: WsEventDoc[];
};

@ApiTags('WebSockets')
@Controller('ws-docs')
export class WsDocsController {
  @Get()
  @ApiOkResponse({ description: 'Socket.IO events catalog' })
  getDocs(): WsApiDocs {
    return {
      protocol: 'socket.io',
      handshake: {
        query: { userId: 'UUID (required)' },
      },
      clientToServer: [
        {
          event: 'joinChat',
          direction: 'client->server',
          description:
            'Приєднатись до кімнати чату. В твоїх codebase підписано в ChatsGateway і MessagesGateway.',
          payloadExample: { chatId: 'chat-uuid' },
          emitsTo: 'client ack: { joined: true }',
        },
        {
          event: 'leaveChat',
          direction: 'client->server',
          description: 'Вийти з кімнати чату.',
          payloadExample: { chatId: 'chat-uuid' },
        },
        {
          event: 'myChats',
          direction: 'client->server',
          description: 'Отримати чати, де поточний користувач учасник.',
          payloadExample: undefined,
        },
        {
          event: 'searchPublicChats',
          direction: 'client->server',
          description: 'Пошук публічних чатів (за name).',
          payloadExample: { search: 'keyword' },
        },
        {
          event: 'createChat',
          direction: 'client->server',
          description: 'Створити чат.',
          payloadExample: { name: 'Чат', isPrivate: false, isGroup: false },
        },
        {
          event: 'sendMessage',
          direction: 'client->server',
          description: 'Надіслати повідомлення в чат.',
          payloadExample: {
            chatId: 'chat-uuid',
            content: 'hello',
            replyToId: null,
          },
        },
        {
          event: 'sendMessageWithFile',
          direction: 'client->server',
          description:
            'Надіслати файл як base64 (малий розмір). Для великих файлів: HTTP POST /messages/upload.',
          payloadExample: {
            chatId: 'chat-uuid',
            base64: '...',
            fileName: 'a.png',
            mimeType: 'image/png',
            content: 'optional caption',
            replyToId: null,
          },
        },
        {
          event: 'typingStart',
          direction: 'client->server',
          description: 'Старт індикатора друкування.',
          payloadExample: { chatId: 'chat-uuid' },
        },
        {
          event: 'typingStop',
          direction: 'client->server',
          description: 'Стоп індикатора друкування.',
          payloadExample: { chatId: 'chat-uuid' },
        },
        {
          event: 'getMessages',
          direction: 'client->server',
          description:
            'Отримати останні повідомлення чату (limit у сервісі дефолтний).',
          payloadExample: { chatId: 'chat-uuid' },
        },
        {
          event: 'markMessagesRead',
          direction: 'client->server',
          description:
            'Позначити повідомлення як прочитані (створює записи в message_reads і відсилає messagesRead).',
          payloadExample: {
            chatId: 'chat-uuid',
            messageIds: ['msg-uuid-1', 'msg-uuid-2'],
          },
        },
        {
          event: 'createStory',
          direction: 'client->server',
          description: 'Створити сторіз через WS (mediaUrl як URL).',
          payloadExample: {
            mediaUrl: 'https://...',
            caption: '...',
            expiresInHours: 24,
          },
        },
        {
          event: 'getStories',
          direction: 'client->server',
          description: 'Отримати активні сторіз.',
          payloadExample: { userId: 'optional' },
        },
        {
          event: 'shareLocation',
          direction: 'client->server',
          description:
            'Надіслати геолокацію в чат/системі (зберігається в БД).',
          payloadExample: { lat: 49.45, lng: 32.05 },
        },
        {
          event: 'getTodayRoute',
          direction: 'client->server',
          description: 'Маршрут користувача за сьогодні.',
          payloadExample: undefined,
        },
        {
          event: 'createFolder',
          direction: 'client->server',
          description: 'Створити папку.',
          payloadExample: { name: 'My folder' },
        },
        {
          event: 'myFolders',
          direction: 'client->server',
          description: 'Отримати папки користувача.',
          payloadExample: undefined,
        },
        {
          event: 'addChatToFolder',
          direction: 'client->server',
          description: 'Додати чат у папку.',
          payloadExample: { folderId: 'folder-uuid', chatId: 'chat-uuid' },
        },
        {
          event: 'removeChatFromFolder',
          direction: 'client->server',
          description: 'Видалити чат з папки.',
          payloadExample: { folderId: 'folder-uuid', chatId: 'chat-uuid' },
        },
        {
          event: 'startCall',
          direction: 'client->server',
          description:
            'Старт дзвінка: створює Call у БД і шле callStarted в кімнату чату.',
          payloadExample: { chatId: 'chat-uuid' },
        },
        {
          event: 'endCall',
          direction: 'client->server',
          description: 'Завершити дзвінок (Call -> ended).',
          payloadExample: { callId: 'call-uuid' },
        },
        {
          event: 'callSignal',
          direction: 'client->server',
          description:
            'Сигналінг для WebRTC (offer/answer/ice). У твоєму бекенді — broadcast на весь сервер.',
          payloadExample: {
            callId: 'call-uuid',
            signal: { type: 'offer', sdp: '...' },
          },
        },
      ],
      serverToClient: [
        {
          event: 'userOnline',
          direction: 'server->client',
          description: 'Емітиться PresenceGateway при підключенні.',
          payloadExample: { userId: 'uuid', at: 'ISO' },
        },
        {
          event: 'userOffline',
          direction: 'server->client',
          description: 'Емітиться PresenceGateway при disconnect.',
          payloadExample: { userId: 'uuid', at: 'ISO' },
        },
        {
          event: 'messageCreated',
          direction: 'server->client',
          description: 'Новий message у кімнату `chat:<chatId>`.',
          payloadExample: {
            id: 'msg',
            chatId: 'chat',
            userId: 'user',
            content: '...',
          },
          emitsTo: 'room chat:<chatId>',
        },
        {
          event: 'messagesRead',
          direction: 'server->client',
          description: 'Повертає who-read: у кімнату `chat:<chatId>`.',
          payloadExample: {
            chatId: 'chat-uuid',
            receipts: [
              { messageId: 'msg-uuid', userId: 'user-uuid', readAt: 'ISO' },
            ],
          },
          emitsTo: 'room chat:<chatId>',
        },
        {
          event: 'userTyping',
          direction: 'server->client',
          description: 'Індикатор друкування в кімнату чату.',
          payloadExample: {
            userId: 'user-uuid',
            chatId: 'chat-uuid',
            typing: true,
          },
          emitsTo: 'room chat:<chatId>',
        },
        {
          event: 'storyCreated',
          direction: 'server->client',
          description: 'Нова сторіз.',
          payloadExample: { id: 'story-uuid', mediaUrl: 'https://...' },
        },
        {
          event: 'locationShared',
          direction: 'server->client',
          description: 'Нова локація (point).',
          payloadExample: { id: 'loc-uuid', lat: 1, lng: 2 },
        },
        {
          event: 'callStarted',
          direction: 'server->client',
          description: 'Старт дзвінка у кімнату чату `chat:<chatId>`.',
          payloadExample: {
            id: 'call-uuid',
            chatId: 'chat-uuid',
            status: 'ringing',
          },
          emitsTo: 'room chat:<chatId>',
        },
        {
          event: 'callEnded',
          direction: 'server->client',
          description: 'Завершений дзвінок (broadcast global у твоєму коді).',
          payloadExample: { id: 'call-uuid', status: 'ended' },
        },
        {
          event: 'callSignal',
          direction: 'server->client',
          description: 'Сигналінг для WebRTC (broadcast global у твоєму коді).',
          payloadExample: {
            callId: 'call-uuid',
            signal: { type: 'answer', sdp: '...' },
          },
        },
      ],
    };
  }
}
