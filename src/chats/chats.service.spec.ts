import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatsService } from './chats.service';
import { Chat } from './entities/chat.entity';
import { ChatMember } from './entities/chat-member.entity';

describe('ChatsService', () => {
  let service: ChatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        {
          provide: getRepositoryToken(Chat),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(ChatMember),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              delete: jest.fn().mockReturnThis(),
              from: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue(undefined),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<ChatsService>(ChatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
