import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WalletAccount } from './entities/wallet-account.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { User } from '../users/entities/user.entity';
import { ProductsService } from '../products/products.service';
import { toWalletTransactionWire } from './wallet-transaction.wire';

function asBigint(v: string): bigint {
  try {
    return BigInt(v);
  } catch {
    throw new BadRequestException('Invalid integer amount');
  }
}

@Injectable()
export class WalletService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WalletAccount)
    private readonly accountRepo: Repository<WalletAccount>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    private readonly products: ProductsService,
  ) {}

  private async getOrCreateAccount(userId: string, currency: string) {
    const existing = await this.accountRepo.findOne({
      where: { user: { id: userId }, currency },
      relations: ['user'],
    });
    if (existing) return existing;
    const created = this.accountRepo.create({
      user: { id: userId } as User,
      currency,
      balance: '0',
    });
    return this.accountRepo.save(created);
  }

  async getMyAccount(userId: string, currency = 'COIN') {
    return this.getOrCreateAccount(userId, currency);
  }

  /**
   * Paginated ledger for this user's wallet account (newest first).
   * Pass `cursor` = previous page's `nextCursor` (transaction id).
   */
  async listMyTransactionsPage(
    userId: string,
    opts: { currency?: string; limit?: number; cursor?: string },
  ): Promise<{
    items: ReturnType<typeof toWalletTransactionWire>[];
    nextCursor: string | null;
  }> {
    const currency = opts.currency ?? 'COIN';
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
    const account = await this.getOrCreateAccount(userId, currency);

    let cursorCreatedAt: Date | undefined;
    let cursorId: string | undefined;
    if (opts.cursor) {
      const cur = await this.txRepo.findOne({
        where: { id: opts.cursor, account: { id: account.id } },
        select: ['id', 'createdAt'],
      });
      if (cur) {
        cursorCreatedAt =
          cur.createdAt instanceof Date
            ? cur.createdAt
            : new Date(cur.createdAt as unknown as string);
        cursorId = cur.id;
      }
    }

    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.account_id = :accountId', { accountId: account.id })
      .orderBy('t.createdAt', 'DESC')
      .addOrderBy('t.id', 'DESC')
      .take(limit);

    if (cursorCreatedAt && cursorId) {
      qb.andWhere(
        '(t.createdAt < :cAt OR (t.createdAt = :cAt AND t.id < :cId))',
        { cAt: cursorCreatedAt, cId: cursorId },
      );
    }

    const rows = await qb.getMany();
    const items = rows.map((r) => toWalletTransactionWire(r));
    const nextCursor =
      rows.length === limit ? rows[rows.length - 1].id : null;
    return { items, nextCursor };
  }

  async setBalanceFromClient(
    userId: string,
    currency: string,
    newBalanceStr: string,
    note?: string,
  ) {
    const newBal = asBigint(newBalanceStr);
    const account = await this.getOrCreateAccount(userId, currency);

    return this.dataSource.transaction(async (manager) => {
      const accRepo = manager.getRepository(WalletAccount);
      const txRepo = manager.getRepository(WalletTransaction);

      // Lock row for update (works on Postgres; on SQLite it becomes serialized anyway)
      const acc = await accRepo.findOne({
        where: { id: account.id },
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!acc) throw new NotFoundException('Account not found');

      const oldBal = BigInt(acc.balance);
      const delta = newBal - oldBal;
      if (delta === 0n) return acc;

      acc.balance = newBal.toString();
      await accRepo.save(acc);

      await txRepo.save(
        txRepo.create({
          account: { id: acc.id } as WalletAccount,
          user: { id: userId } as User,
          type: 'adjustment',
          amount: delta.toString(),
          currency,
          note: note ?? null,
          counterpartyUserId: null,
          productId: null,
        }),
      );

      return acc;
    });
  }

  async earn(
    userId: string,
    currency: string,
    amountStr: string,
    note?: string,
  ) {
    const amount = asBigint(amountStr);
    if (amount <= 0n) throw new BadRequestException('amount must be positive');
    const account = await this.getOrCreateAccount(userId, currency);

    return this.dataSource.transaction(async (manager) => {
      const accRepo = manager.getRepository(WalletAccount);
      const txRepo = manager.getRepository(WalletTransaction);
      const acc = await accRepo.findOne({
        where: { id: account.id },
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!acc) throw new NotFoundException('Account not found');
      acc.balance = (BigInt(acc.balance) + amount).toString();
      await accRepo.save(acc);
      await txRepo.save(
        txRepo.create({
          account: { id: acc.id } as WalletAccount,
          user: { id: userId } as User,
          type: 'earn',
          amount: amount.toString(),
          currency,
          note: note ?? null,
          counterpartyUserId: null,
          productId: null,
        }),
      );
      return acc;
    });
  }

  async transfer(
    fromUserId: string,
    toUserId: string,
    currency: string,
    amountStr: string,
    note?: string,
  ) {
    if (fromUserId === toUserId)
      throw new BadRequestException('Cannot transfer to yourself');
    const amount = asBigint(amountStr);
    if (amount <= 0n) throw new BadRequestException('amount must be positive');

    const fromAcc = await this.getOrCreateAccount(fromUserId, currency);
    const toAcc = await this.getOrCreateAccount(toUserId, currency);

    return this.dataSource.transaction(async (manager) => {
      const accRepo = manager.getRepository(WalletAccount);
      const txRepo = manager.getRepository(WalletTransaction);

      const a1 = await accRepo.findOne({
        where: { id: fromAcc.id },
        lock: { mode: 'pessimistic_write' as any },
      });
      const a2 = await accRepo.findOne({
        where: { id: toAcc.id },
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!a1 || !a2) throw new NotFoundException('Account not found');

      const b1 = BigInt(a1.balance);
      if (b1 < amount) throw new BadRequestException('Insufficient funds');

      a1.balance = (b1 - amount).toString();
      a2.balance = (BigInt(a2.balance) + amount).toString();
      await accRepo.save([a1, a2]);

      await txRepo.save([
        txRepo.create({
          account: { id: a1.id } as WalletAccount,
          user: { id: fromUserId } as User,
          type: 'transfer_out',
          amount: (-amount).toString(),
          currency,
          counterpartyUserId: toUserId,
          productId: null,
          note: note ?? null,
        }),
        txRepo.create({
          account: { id: a2.id } as WalletAccount,
          user: { id: toUserId } as User,
          type: 'transfer_in',
          amount: amount.toString(),
          currency,
          counterpartyUserId: fromUserId,
          productId: null,
          note: note ?? null,
        }),
      ]);

      return { from: a1, to: a2 };
    });
  }

  async purchase(userId: string, productId: string, quantity = 1) {
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 1000) {
      throw new BadRequestException('Invalid quantity');
    }
    const product = await this.products.findOne(productId);
    if (!product.active) throw new BadRequestException('Product is not active');

    const currency = product.currency;
    const account = await this.getOrCreateAccount(userId, currency);

    const unitPrice = asBigint(product.priceAmount);
    const total = unitPrice * BigInt(quantity);

    return this.dataSource.transaction(async (manager) => {
      const accRepo = manager.getRepository(WalletAccount);
      const txRepo = manager.getRepository(WalletTransaction);

      const acc = await accRepo.findOne({
        where: { id: account.id },
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!acc) throw new NotFoundException('Account not found');
      const bal = BigInt(acc.balance);
      if (bal < total) throw new BadRequestException('Insufficient funds');

      acc.balance = (bal - total).toString();
      await accRepo.save(acc);

      await txRepo.save(
        txRepo.create({
          account: { id: acc.id } as WalletAccount,
          user: { id: userId } as User,
          type: 'purchase',
          amount: (-total).toString(),
          currency,
          counterpartyUserId: null,
          productId,
          note: `purchase x${quantity}: ${product.name}`,
        }),
      );

      return acc;
    });
  }
}
