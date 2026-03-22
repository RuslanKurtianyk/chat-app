import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.userRepo.findOne({ where: { mobile: createUserDto.mobile } });
    if (existing) {
      throw new ConflictException('User with this mobile already exists');
    }
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepo.create({
      mobile: createUserDto.mobile,
      passwordHash,
    });
    const saved = await this.userRepo.save(user);
    return this.sanitize(saved);
  }

  async findByMobile(mobile: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { mobile } });
  }

  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.userRepo.find({ order: { createdAt: 'ASC' } });
    return users.map((u) => this.sanitize(u));
  }

  async findOne(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.userRepo.findOne({ where: { id } });
    return user ? this.sanitize(user) : null;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const payload: Partial<User> = {};
    if ('password' in updateUserDto && updateUserDto.password) {
      payload.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }
    if (updateUserDto.mobile !== undefined) payload.mobile = updateUserDto.mobile;
    if (updateUserDto.avatarUrl !== undefined) payload.avatarUrl = updateUserDto.avatarUrl;
    if (updateUserDto.nickname !== undefined) payload.nickname = updateUserDto.nickname;
    if (Object.keys(payload).length > 0) {
      await this.userRepo.update(id, payload);
    }
    return this.findOne(id);
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.userRepo.update(userId, { lastActiveAt: new Date() });
  }

  async remove(id: string): Promise<void> {
    await this.userRepo.delete(id);
  }

  private sanitize(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _, ...rest } = user;
    return rest;
  }
}
