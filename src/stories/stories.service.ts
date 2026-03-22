import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Story } from './entities/story.entity';

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(Story)
    private readonly storyRepo: Repository<Story>,
  ) {}

  async create(
    userId: string,
    mediaUrl: string,
    caption?: string,
    expiresInHours = 24,
  ): Promise<Story> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    const story = this.storyRepo.create({
      userId,
      mediaUrl,
      caption: caption ?? null,
      expiresAt,
    });
    return this.storyRepo.save(story);
  }

  async findActive(userId?: string): Promise<Story[]> {
    const qb = this.storyRepo
      .createQueryBuilder('s')
      .where('s.expiresAt > :now', { now: new Date() })
      .orderBy('s.createdAt', 'DESC');
    if (userId) qb.andWhere('s.userId = :userId', { userId });
    return qb.getMany();
  }

  async findOne(id: string): Promise<Story | null> {
    return this.storyRepo.findOne({ where: { id }, relations: ['user'] });
  }

  async remove(id: string, userId: string): Promise<void> {
    const s = await this.storyRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Story not found');
    if (s.userId !== userId) throw new NotFoundException('Forbidden');
    await this.storyRepo.delete(id);
  }

  async deleteExpired(): Promise<number> {
    const result = await this.storyRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }
}
