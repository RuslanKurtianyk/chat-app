import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from './entities/call.entity';
import { CallStatus } from './entities/call.entity';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepo: Repository<Call>,
  ) {}

  async create(chatId: string, initiatorId: string): Promise<Call> {
    const call = this.callRepo.create({
      chatId,
      initiatorId,
      status: 'ringing',
    });
    return this.callRepo.save(call);
  }

  async findOne(id: string): Promise<Call | null> {
    return this.callRepo.findOne({
      where: { id },
      relations: ['chat', 'initiator'],
    });
  }

  async findByChat(chatId: string): Promise<Call | null> {
    return this.callRepo.findOne({
      where: { chatId, status: 'ringing' },
      order: { createdAt: 'DESC' },
    });
  }

  async start(id: string): Promise<Call> {
    const call = await this.callRepo.findOne({ where: { id } });
    if (!call) throw new NotFoundException('Call not found');
    call.status = 'active';
    call.startedAt = new Date();
    return this.callRepo.save(call);
  }

  async end(id: string): Promise<Call> {
    const call = await this.callRepo.findOne({ where: { id } });
    if (!call) throw new NotFoundException('Call not found');
    call.status = 'ended';
    call.endedAt = new Date();
    return this.callRepo.save(call);
  }
}
