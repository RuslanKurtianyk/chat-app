import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Folder } from './entities/folder.entity';
import { FolderChat } from './entities/folder-chat.entity';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private readonly folderRepo: Repository<Folder>,
    @InjectRepository(FolderChat)
    private readonly folderChatRepo: Repository<FolderChat>,
  ) {}

  async create(userId: string, name: string): Promise<Folder> {
    const folder = this.folderRepo.create({ userId, name });
    return this.folderRepo.save(folder);
  }

  async findByUser(userId: string): Promise<Folder[]> {
    return this.folderRepo.find({
      where: { userId },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Folder | null> {
    const folder = await this.folderRepo.findOne({
      where: { id, userId },
      relations: ['user'],
    });
    return folder;
  }

  async addChat(folderId: string, chatId: string, userId: string): Promise<FolderChat> {
    const folder = await this.folderRepo.findOne({ where: { id: folderId, userId } });
    if (!folder) throw new NotFoundException('Folder not found');
    const existing = await this.folderChatRepo.findOne({ where: { folderId, chatId } });
    if (existing) return existing;
    const fc = this.folderChatRepo.create({ folderId, chatId });
    return this.folderChatRepo.save(fc);
  }

  async removeChat(folderId: string, chatId: string, userId: string): Promise<void> {
    const folder = await this.folderRepo.findOne({ where: { id: folderId, userId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.folderChatRepo.delete({ folderId, chatId });
  }

  async update(id: string, userId: string, name: string): Promise<Folder> {
    const folder = await this.folderRepo.findOne({ where: { id, userId } });
    if (!folder) throw new NotFoundException('Folder not found');
    folder.name = name;
    return this.folderRepo.save(folder);
  }

  async remove(id: string, userId: string): Promise<void> {
    const folder = await this.folderRepo.findOne({ where: { id, userId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.folderRepo.delete(id);
  }
}
