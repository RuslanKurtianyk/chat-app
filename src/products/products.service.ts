import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const p = await this.findOne(id);
    if (dto.name !== undefined) p.name = dto.name;
    if (dto.priceAmount !== undefined) p.priceAmount = dto.priceAmount;
    if (dto.imageUrl !== undefined) p.imageUrl = dto.imageUrl;
    if (dto.currency !== undefined) p.currency = dto.currency;
    if (dto.active !== undefined) p.active = dto.active;
    return this.productRepo.save(p);
  }

  async remove(id: string): Promise<void> {
    const p = await this.findOne(id);
    await this.productRepo.remove(p);
  }

  async findAllPaged(page: number, limit: number, activeOnly?: boolean) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = Math.max(page - 1, 0) * take;
    const where =
      activeOnly === undefined
        ? {}
        : activeOnly
          ? { active: true }
          : { active: false };
    const [items, total] = await this.productRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { items, total, page, limit: take };
  }
}
