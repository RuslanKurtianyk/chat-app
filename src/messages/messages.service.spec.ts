import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { Message } from './entities/message.entity';
import { ChatsService } from '../chats/chats.service';
import { CloudinaryService } from '../storage/cloudinary.service';
import { UsersService } from '../users/users.service';
import { MessagesGateway } from './messages.gateway';

describe('MessagesService', () => {
  let service: MessagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getRepositoryToken(Message),
          useValue: {
            create: jest.fn((x) => x),
            save: jest.fn(async (x) => ({ id: 'm1', ...x })),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: ChatsService, useValue: { isMember: jest.fn().mockResolvedValue(true) } },
        {
          provide: CloudinaryService,
          useValue: { uploadBuffer: jest.fn().mockResolvedValue({ secureUrl: 'https://example.com/a.png' }) },
        },
        { provide: UsersService, useValue: { updateLastActive: jest.fn() } },
        {
          provide: MessagesGateway,
          useValue: { broadcastMessageCreated: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
