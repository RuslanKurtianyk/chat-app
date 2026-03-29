import { Test, TestingModule } from '@nestjs/testing';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';
import { ChatsService } from '../chats/chats.service';

describe('MessagesGateway', () => {
  let gateway: MessagesGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesGateway,
        {
          provide: MessagesService,
          useValue: {
            create: jest.fn(),
            createWithBase64File: jest.fn(),
            findByChat: jest.fn(),
            markMessagesRead: jest.fn(),
          },
        },
        {
          provide: ChatsService,
          useValue: { join: jest.fn() },
        },
      ],
    }).compile();

    gateway = module.get<MessagesGateway>(MessagesGateway);
    (gateway as any).server = { to: () => ({ emit: jest.fn() }) };
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
