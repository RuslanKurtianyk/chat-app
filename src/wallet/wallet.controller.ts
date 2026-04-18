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

/**
 * Internal currency (default `COIN`): balance + immutable ledger (`wallet_transactions`).
 *
 * - **Send money to another user:** `POST /wallet/me/transfer` — creates paired `transfer_out` / `transfer_in` rows (history on both sides).
 * - **Buy catalog product:** `POST /wallet/me/purchase` — debits buyer, records `purchase` with `productId` (and note with product name).
 * - **History:** `GET /wallet/me/transactions` — paginated (`cursor`, `limit`), each row includes `direction` + `summary`.
 */
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

  /** Peer-to-peer internal transfer; persisted as two mirrored transactions. */
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

  /** Spend internal currency on a product; one `purchase` ledger row per checkout. */
  @Post('me/purchase')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  purchase(
    @Headers('x-user-id') userId: string,
    @Body() dto: WalletPurchaseDto,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.wallet.purchase(userId, dto.productId, dto.quantity ?? 1);
  }

  /** Newest first; `cursor` = previous response `nextCursor`. */
  @Get('me/transactions')
  listTx(
    @Headers('x-user-id') userId: string,
    @Query('currency') currency?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.wallet.listMyTransactionsPage(userId, {
      currency: currency ?? 'COIN',
      limit: limit ? Number(limit) : 50,
      cursor: cursor?.trim() || undefined,
    });
  }
}
