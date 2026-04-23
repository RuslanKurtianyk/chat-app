import { Module } from '@nestjs/common';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { AdminProductsController } from './admin-products.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminWalletController } from './admin-wallet.controller';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [ProductsModule, UsersModule, WalletModule],
  controllers: [
    AdminProductsController,
    AdminUsersController,
    AdminWalletController,
  ],
  providers: [AdminApiKeyGuard],
})
export class AdminModule {}
