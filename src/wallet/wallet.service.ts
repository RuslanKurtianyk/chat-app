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
import { MarketplaceService } from '../marketplace/marketplace.service';

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
    private readonly marketplace: MarketplaceService,
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
          listingId: null,
          offerId: null,
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
          listingId: null,
          offerId: null,
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
          listingId: null,
          offerId: null,
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
          listingId: null,
          offerId: null,
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
          listingId: null,
          offerId: null,
          note: `purchase x${quantity}: ${product.name}`,
        }),
      );

      await this.marketplace.grantInventoryAfterCatalogPurchase(
        manager,
        userId,
        productId,
        quantity,
      );

      return acc;
    });
  }

  /**
   * Global ledger (newest first), cursor-paginated. Optional filters by owner, currency, type.
   */
  async adminListTransactionsPage(opts: {
    limit?: number;
    cursor?: string;
    userId?: string;
    currency?: string;
    type?: string;
  }): Promise<{
    items: ReturnType<typeof toWalletTransactionWire>[];
    nextCursor: string | null;
  }> {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);

    let cursorCreatedAt: Date | undefined;
    let cursorId: string | undefined;
    if (opts.cursor) {
      const cur = await this.txRepo.findOne({
        where: { id: opts.cursor },
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
      .orderBy('t.createdAt', 'DESC')
      .addOrderBy('t.id', 'DESC')
      .take(limit);

    if (opts.userId) {
      qb.andWhere('t.user_id = :uid', { uid: opts.userId });
    }
    if (opts.currency) {
      qb.andWhere('t.currency = :cur', { cur: opts.currency });
    }
    if (opts.type) {
      qb.andWhere('t.type = :typ', { typ: opts.type });
    }
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

  async adminListAccountsPage(
    page: number,
    limit: number,
    filters?: { userId?: string; currency?: string },
  ) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = Math.max(page - 1, 0) * take;
    const qb = this.accountRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .orderBy('a.updatedAt', 'DESC')
      .skip(skip)
      .take(take);
    if (filters?.userId) {
      qb.andWhere('a.user_id = :uid', { uid: filters.userId });
    }
    if (filters?.currency) {
      qb.andWhere('a.currency = :cur', { cur: filters.currency });
    }
    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((a) => ({
        id: a.id,
        userId: a.userId,
        mobile: a.user?.mobile ?? null,
        currency: a.currency,
        balance: a.balance,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      total,
      page,
      limit: take,
    };
  }

  /**
   * Apply a signed delta to the user's balance and record an `adjustment` row.
   * Resulting balance must stay non-negative.
   */
  async applyAdminAdjustment(
    userId: string,
    currency: string,
    deltaStr: string,
    note?: string,
  ) {
    const delta = asBigint(deltaStr);
    if (delta === 0n) {
      throw new BadRequestException('delta must be non-zero');
    }
    const account = await this.getOrCreateAccount(userId, currency);

    return this.dataSource.transaction(async (manager) => {
      const accRepo = manager.getRepository(WalletAccount);
      const txRepo = manager.getRepository(WalletTransaction);
      const acc = await accRepo.findOne({
        where: { id: account.id },
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!acc) throw new NotFoundException('Account not found');
      const newBal = BigInt(acc.balance) + delta;
      if (newBal < 0n) {
        throw new BadRequestException('Insufficient funds');
      }
      acc.balance = newBal.toString();
      await accRepo.save(acc);
      const prefix = '[admin]';
      const fullNote = note?.trim()
        ? `${prefix} ${note.trim()}`
        : prefix;
      await txRepo.save(
        txRepo.create({
          account: { id: acc.id } as WalletAccount,
          user: { id: userId } as User,
          type: 'adjustment',
          amount: delta.toString(),
          currency,
          note: fullNote,
          counterpartyUserId: null,
          productId: null,
          listingId: null,
          offerId: null,
        }),
      );
      return acc;
    });
  }
}
