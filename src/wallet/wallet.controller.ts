import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  WalletEarnDto,
  WalletPurchaseDto,
  WalletSetBalanceDto,
  WalletTransferDto,
} from './dto/wallet.dto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('me')
  getMe(
    @Headers('x-user-id') userId: string,
    @Query('currency') currency?: string,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.wallet.getMyAccount(userId, currency ?? 'COIN');
  }

  /** Клієнт прислав новий баланс → сервер робить adjustment-транзакцію на різницю. */
  @Post('me/set-balance')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  setBalance(
    @Headers('x-user-id') userId: string,
    @Body() dto: WalletSetBalanceDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.wallet.setBalanceFromClient(
      userId,
      dto.currency ?? 'COIN',
      dto.balance,
      dto.note,
    );
  }

  @Post('me/earn')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  earn(@Headers('x-user-id') userId: string, @Body() dto: WalletEarnDto) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.wallet.earn(
      userId,
      dto.currency ?? 'COIN',
      dto.amount,
      dto.note,
    );
  }

  @Post('me/transfer')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  transfer(
    @Headers('x-user-id') userId: string,
    @Body() dto: WalletTransferDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.wallet.transfer(
      userId,
      dto.toUserId,
      dto.currency ?? 'COIN',
      dto.amount,
      dto.note,
    );
  }

  @Post('me/purchase')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  purchase(
    @Headers('x-user-id') userId: string,
    @Body() dto: WalletPurchaseDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.wallet.purchase(userId, dto.productId, dto.quantity ?? 1);
  }

  @Get('me/transactions')
  listTx(
    @Headers('x-user-id') userId: string,
    @Query('currency') currency?: string,
    @Query('limit') limit?: string,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.wallet.listMyTransactions(
      userId,
      currency ?? 'COIN',
      limit ? Number(limit) : 50,
    );
  }
}
