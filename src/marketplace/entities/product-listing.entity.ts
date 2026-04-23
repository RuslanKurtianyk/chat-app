import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('product_listings')
export class ProductListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @RelationId((l: ProductListing) => l.seller)
  sellerId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @RelationId((l: ProductListing) => l.product)
  productId: string;

  /** Minor units per single item (seller’s asking price). */
  @Column({ name: 'unit_price', type: 'bigint' })
  unitPrice: string;

  @Column({ type: 'varchar', length: 12, default: 'COIN' })
  currency: string;

  @Column({ name: 'quantity_available', type: 'int' })
  quantityAvailable: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
