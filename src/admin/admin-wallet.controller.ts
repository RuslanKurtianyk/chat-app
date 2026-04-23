import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { WalletService } from '../wallet/wallet.service';
import { AdminWalletAdjustDto } from './dto/admin-wallet-adjust.dto';

@Controller('admin/wallet')
@UseGuards(AdminApiKeyGuard)
export class AdminWalletController {
  constructor(private readonly wallet: WalletService) {}

  /** Global transaction history (cursor pagination, newest first). */
  @Get('transactions')
  transactions(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('currency') currency?: string,
    @Query('type') type?: string,
  ) {
    const lim = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 100);
    return this.wallet.adminListTransactionsPage({
      cursor: cursor || undefined,
      limit: lim,
      userId: userId?.trim() || undefined,
      currency: currency?.trim() || undefined,
      type: type?.trim() || undefined,
    });
  }

  /** Paginated wallet accounts (balances per user × currency). */
  @Get('accounts')
  accounts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('currency') currency?: string,
  ) {
    const p = Math.max(parseInt(page || '1', 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
    return this.wallet.adminListAccountsPage(p, l, {
      userId: userId?.trim() || undefined,
      currency: currency?.trim() || undefined,
    });
  }

  /** Credit or debit a user's balance (signed `delta`). */
  @Post('users/:userId/adjust')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  adjust(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdminWalletAdjustDto,
  ) {
    const currency = dto.currency?.trim() || 'COIN';
    return this.wallet.applyAdminAdjustment(
      userId,
      currency,
      dto.delta,
      dto.note,
    );
  }
}
