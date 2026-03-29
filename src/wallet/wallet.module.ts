import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletAccount } from './entities/wallet-account.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([WalletAccount, WalletTransaction]), ProductsModule],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}

