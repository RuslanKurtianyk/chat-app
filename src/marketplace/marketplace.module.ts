import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserInventory } from './entities/user-inventory.entity';
import { ProductListing } from './entities/product-listing.entity';
import { MarketplaceOffer } from './entities/marketplace-offer.entity';
import { WalletAccount } from '../wallet/entities/wallet-account.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { ProductsModule } from '../products/products.module';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserInventory,
      ProductListing,
      MarketplaceOffer,
      WalletAccount,
      WalletTransaction,
    ]),
    ProductsModule,
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
