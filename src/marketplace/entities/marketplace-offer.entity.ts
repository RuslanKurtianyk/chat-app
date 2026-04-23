import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductListing } from './product-listing.entity';

export type MarketplaceOfferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled';

@Entity('marketplace_offers')
export class MarketplaceOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProductListing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: ProductListing;

  @RelationId((o: MarketplaceOffer) => o.listing)
  listingId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @RelationId((o: MarketplaceOffer) => o.buyer)
  buyerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @RelationId((o: MarketplaceOffer) => o.seller)
  sellerId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @RelationId((o: MarketplaceOffer) => o.product)
  productId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'bigint' })
  unitPrice: string;

  @Column({ type: 'varchar', length: 12 })
  currency: string;

  @Column({ type: 'varchar', length: 20 })
  status: MarketplaceOfferStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
