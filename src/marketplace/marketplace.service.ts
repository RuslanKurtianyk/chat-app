import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
} from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { WalletAccount } from '../wallet/entities/wallet-account.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { UserInventory } from './entities/user-inventory.entity';
import { ProductListing } from './entities/product-listing.entity';
import { MarketplaceOffer } from './entities/marketplace-offer.entity';
import { CreateListingDto } from './dto/marketplace.dto';

function asBigint(v: string): bigint {
  try {
    return BigInt(v);
  } catch {
    throw new BadRequestException('Invalid integer amount');
  }
}

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(UserInventory)
    private readonly invRepo: Repository<UserInventory>,
    @InjectRepository(ProductListing)
    private readonly listingRepo: Repository<ProductListing>,
    @InjectRepository(MarketplaceOffer)
    private readonly offerRepo: Repository<MarketplaceOffer>,
    @InjectRepository(WalletAccount)
    private readonly accountRepo: Repository<WalletAccount>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    private readonly products: ProductsService,
  ) {}

  /** After buying from the global catalog, items are credited to inventory (same DB transaction). */
  async grantInventoryAfterCatalogPurchase(
    manager: EntityManager,
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<void> {
    await this.adjustInventoryDelta(manager, userId, productId, quantity);
  }

  async getMyInventory(userId: string) {
    return this.invRepo.find({
      where: { user: { id: userId } },
      relations: ['product'],
      order: { id: 'ASC' },
    });
  }

  async listActiveListings() {
    return this.listingRepo.find({
      where: { active: true },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getListing(id: string) {
    const l = await this.listingRepo.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!l) throw new NotFoundException('Listing not found');
    return l;
  }

  /** Offers waiting for seller action. */
  async myPendingSales(sellerId: string) {
    return this.offerRepo.find({
      where: { sellerId, status: 'pending' },
      relations: ['listing', 'product'],
      order: { createdAt: 'ASC' },
    });
  }

  /** Offers you placed as buyer. */
  async myPendingPurchases(buyerId: string) {
    return this.offerRepo.find({
      where: { buyerId, status: 'pending' },
      relations: ['listing', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a sell listing: removes units from seller inventory (reserved until sold or cancel).
   */
  async createListing(sellerId: string, dto: CreateListingDto) {
    const product = await this.products.findOne(dto.productId);
    if (!product.active) throw new BadRequestException('Product is not active');
    const qty = dto.quantity;
    const unitPrice = asBigint(dto.unitPrice);
    if (unitPrice <= 0n) throw new BadRequestException('unitPrice must be positive');
    const currency = dto.currency?.trim() || product.currency;

    return this.dataSource.transaction(async (manager) => {
      await this.adjustInventoryDelta(manager, sellerId, product.id, -qty);
      const repo = manager.getRepository(ProductListing);
      return repo.save(
        repo.create({
          seller: { id: sellerId } as User,
          product: { id: product.id } as Product,
          unitPrice: unitPrice.toString(),
          currency,
          quantityAvailable: qty,
          active: true,
        }),
      );
    });
  }

  /**
   * Buyer requests a trade at the listing’s current unit price (snapshotted on the offer).
   * Stock is reserved on the listing until seller accepts/rejects or buyer cancels.
   */
  async createTradeOffer(buyerId: string, listingId: string, quantity: number) {
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 1000) {
      throw new BadRequestException('Invalid quantity');
    }

    return this.dataSource.transaction(async (manager) => {
      const listRepo = manager.getRepository(ProductListing);
      const listing = await listRepo.findOne({
        where: { id: listingId },
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!listing) throw new NotFoundException('Listing not found');
      if (!listing.active) {
        throw new BadRequestException('Listing is not accepting offers');
      }
      if (listing.sellerId === buyerId) {
        throw new BadRequestException('Cannot place an offer on your own listing');
      }
      if (listing.quantityAvailable < quantity) {
        throw new BadRequestException('Not enough stock on this listing');
      }

      listing.quantityAvailable -= quantity;
      if (listing.quantityAvailable <= 0) {
        listing.quantityAvailable = 0;
        listing.active = false;
      }
      await listRepo.save(listing);

      const offerRepo = manager.getRepository(MarketplaceOffer);
      return offerRepo.save(
        offerRepo.create({
          listing: { id: listing.id } as ProductListing,
          buyer: { id: buyerId } as User,
          seller: { id: listing.sellerId } as User,
          product: { id: listing.productId } as Product,
          quantity,
          unitPrice: listing.unitPrice,
          currency: listing.currency,
          status: 'pending',
        }),
      );
    });
  }

  /** Seller confirms the sale: charge buyer, pay seller, deliver items. */
  async acceptOffer(sellerId: string, offerId: string) {
    return this.dataSource.transaction(async (manager) => {
      const offerRepo = manager.getRepository(MarketplaceOffer);
      const offer = await offerRepo.findOne({
        where: { id: offerId },
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!offer) throw new NotFoundException('Offer not found');
      if (offer.status !== 'pending') {
        throw new BadRequestException('Offer is no longer pending');
      }
      if (offer.sellerId !== sellerId) {
        throw new ForbiddenException('Only the seller can accept this offer');
      }

      const buyerId = offer.buyerId;
      const total = BigInt(offer.unitPrice) * BigInt(offer.quantity);
      const currency = offer.currency;

      const listRepo = manager.getRepository(ProductListing);
      const listing = await listRepo.findOne({
        where: { id: offer.listingId },
      });
      if (!listing) throw new NotFoundException('Listing not found');

      const product = await this.products.findOne(offer.productId);
      await this.transferPaymentForTrade(
        manager,
        buyerId,
        sellerId,
        total,
        currency,
        offer.productId,
        listing.id,
        offer.id,
        offer.quantity,
        product.name,
      );

      offer.status = 'accepted';
      await offerRepo.save(offer);

      return {
        offer,
        paidMinorUnits: total.toString(),
        currency,
      };
    });
  }

  /** Seller declines: reserved stock returns to the listing. */
  async rejectOffer(sellerId: string, offerId: string) {
    return this.releasePendingOffer(sellerId, offerId, 'rejected', true);
  }

  /** Buyer withdraws before seller acts. */
  async cancelOfferByBuyer(buyerId: string, offerId: string) {
    return this.releasePendingOffer(buyerId, offerId, 'cancelled', false);
  }

  /** Seller returns unsold units to inventory; pending offers are voided and stock restored. */
  async cancelListing(sellerId: string, listingId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ProductListing);
      const listing = await repo.findOne({
        where: { id: listingId },
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!listing) throw new NotFoundException('Listing not found');
      if (listing.sellerId !== sellerId) {
        throw new ForbiddenException('Not your listing');
      }

      const offerRepo = manager.getRepository(MarketplaceOffer);
      const pending = await offerRepo.find({
        where: { listing: { id: listingId }, status: 'pending' },
      });
      for (const o of pending) {
        listing.quantityAvailable += o.quantity;
        o.status = 'cancelled';
        await offerRepo.save(o);
      }
      if (listing.quantityAvailable > 0) {
        listing.active = true;
      }
      await repo.save(listing);

      const restore = listing.quantityAvailable;
      if (restore > 0) {
        await this.adjustInventoryDelta(
          manager,
          sellerId,
          listing.productId,
          restore,
        );
      }
      listing.active = false;
      listing.quantityAvailable = 0;
      return repo.save(listing);
    });
  }

  private async releasePendingOffer(
    actorId: string,
    offerId: string,
    terminalStatus: 'rejected' | 'cancelled',
    sellerActor: boolean,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const offerRepo = manager.getRepository(MarketplaceOffer);
      const offer = await offerRepo.findOne({
        where: { id: offerId },
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!offer) throw new NotFoundException('Offer not found');
      if (offer.status !== 'pending') {
        throw new BadRequestException('Offer is no longer pending');
      }
      if (sellerActor && offer.sellerId !== actorId) {
        throw new ForbiddenException('Only the seller can reject this offer');
      }
      if (!sellerActor && offer.buyerId !== actorId) {
        throw new ForbiddenException('Only the buyer can cancel this offer');
      }

      const listRepo = manager.getRepository(ProductListing);
      const listing = await listRepo.findOne({
        where: { id: offer.listingId },
        lock: { mode: 'pessimistic_write' as any },
      });
      if (!listing) throw new NotFoundException('Listing not found');

      listing.quantityAvailable += offer.quantity;
      if (listing.quantityAvailable > 0) {
        listing.active = true;
      }
      await listRepo.save(listing);

      offer.status = terminalStatus;
      await offerRepo.save(offer);
      return offer;
    });
  }

  private async transferPaymentForTrade(
    manager: EntityManager,
    buyerId: string,
    sellerId: string,
    total: bigint,
    currency: string,
    productId: string,
    listingId: string,
    offerId: string,
    quantity: number,
    productName: string,
  ) {
    const accRepo = manager.getRepository(WalletAccount);
    const getOrCreate = async (userId: string) => {
      let a = await accRepo.findOne({
        where: { user: { id: userId }, currency },
      });
      if (!a) {
        a = accRepo.create({
          user: { id: userId } as User,
          currency,
          balance: '0',
        });
        a = await accRepo.save(a);
      }
      return a;
    };

    const buyerAcc = await getOrCreate(buyerId);
    const sellerAcc = await getOrCreate(sellerId);

    const bAcc = await accRepo.findOne({
      where: { id: buyerAcc.id },
      lock: { mode: 'pessimistic_write' as any },
    });
    const sAcc = await accRepo.findOne({
      where: { id: sellerAcc.id },
      lock: { mode: 'pessimistic_write' as any },
    });
    if (!bAcc || !sAcc) throw new NotFoundException('Account not found');

    const bBal = BigInt(bAcc.balance);
    if (bBal < total) throw new BadRequestException('Insufficient funds');

    bAcc.balance = (bBal - total).toString();
    sAcc.balance = (BigInt(sAcc.balance) + total).toString();
    await accRepo.save([bAcc, sAcc]);

    const noteBuy = `Marketplace buy (confirmed): ${quantity}× ${productName}`;
    const noteSell = `Marketplace sale (confirmed): ${quantity}× ${productName}`;

    const txRepo = manager.getRepository(WalletTransaction);
    await txRepo.save([
      txRepo.create({
        account: { id: bAcc.id } as WalletAccount,
        user: { id: buyerId } as User,
        type: 'mkt_purchase',
        amount: (-total).toString(),
        currency,
        counterpartyUserId: sellerId,
        productId,
        listingId,
        offerId,
        note: noteBuy,
      }),
      txRepo.create({
        account: { id: sAcc.id } as WalletAccount,
        user: { id: sellerId } as User,
        type: 'mkt_sale',
        amount: total.toString(),
        currency,
        counterpartyUserId: buyerId,
        productId,
        listingId,
        offerId,
        note: noteSell,
      }),
    ]);

    await this.adjustInventoryDelta(manager, buyerId, productId, quantity);
  }

  private async adjustInventoryDelta(
    manager: EntityManager,
    userId: string,
    productId: string,
    delta: number,
  ) {
    if (delta === 0) return;
    const repo = manager.getRepository(UserInventory);

    const row = await repo
      .createQueryBuilder('i')
      .setLock('pessimistic_write')
      .where('i.user_id = :uid AND i.product_id = :pid', {
        uid: userId,
        pid: productId,
      })
      .getOne();

    if (delta > 0) {
      if (!row) {
        await repo.save(
          repo.create({
            user: { id: userId } as User,
            product: { id: productId } as Product,
            quantity: delta,
          }),
        );
        return;
      }
      row.quantity += delta;
      await repo.save(row);
      return;
    }

    const need = -delta;
    if (!row || row.quantity < need) {
      throw new BadRequestException('Not enough items in inventory');
    }
    row.quantity -= need;
    if (row.quantity === 0) {
      await repo.remove(row);
    } else {
      await repo.save(row);
    }
  }
}
