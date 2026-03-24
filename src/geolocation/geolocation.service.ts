import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LocationPoint } from './entities/location-point.entity';

@Injectable()
export class GeolocationService {
  constructor(
    @InjectRepository(LocationPoint)
    private readonly locationRepo: Repository<LocationPoint>,
  ) {}

  async shareLocation(userId: string, lat: number, lng: number): Promise<LocationPoint> {
    const point = this.locationRepo.create({
      user: { id: userId } as User,
      lat,
      lng,
      sharedAt: new Date(),
    });
    return this.locationRepo.save(point);
  }

  /** Маршрут користувача за сьогодні (всі точки за день) */
  async getTodayRoute(userId: string): Promise<LocationPoint[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    return this.locationRepo.find({
      where: {
        user: { id: userId },
        sharedAt: Between(start, end),
      },
      order: { sharedAt: 'ASC' },
    });
  }

  async getRoute(userId: string, from: Date, to: Date): Promise<LocationPoint[]> {
    return this.locationRepo.find({
      where: {
        user: { id: userId },
        sharedAt: Between(from, to),
      },
      order: { sharedAt: 'ASC' },
    });
  }
}
