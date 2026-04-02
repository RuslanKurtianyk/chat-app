import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const p = this.productRepo.create({
      name: dto.name,
      priceAmount: dto.priceAmount,
      imageUrl: dto.imageUrl ?? null,
      currency: dto.currency ?? 'COIN',
      active: dto.active ?? true,
    });
    return this.productRepo.save(p);
  }

  async findAll(activeOnly = true): Promise<Product[]> {
    return this.productRepo.find({
      where: activeOnly ? { active: true } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const p = await this.productRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }
}
