import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ConflictException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { ProductsService } from '../products/products.service';
import { CreateProductDto } from '../products/dto/product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';

@Controller('admin/products')
@UseGuards(AdminApiKeyGuard)
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('active') active?: string,
  ) {
    const p = Math.max(parseInt(page || '1', 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
    const activeOnly =
      active === 'true' ? true : active === 'false' ? false : undefined;
    return this.products.findAllPaged(p, l, activeOnly);
  }

  @Get(':id')
  async one(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    try {
      await this.products.remove(id);
    } catch (e) {
      if (e instanceof QueryFailedError) {
        throw new ConflictException(
          'Cannot delete product: it may still be referenced by inventory or listings',
        );
      }
      throw e;
    }
  }
}
