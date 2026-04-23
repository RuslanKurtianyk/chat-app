import { WalletTransaction } from './entities/wallet-transaction.entity';

export type WalletTransactionDirection = 'credit' | 'debit' | 'neutral';

/** JSON-safe ledger row for clients (amount is signed minor units as string). */
export function toWalletTransactionWire(t: WalletTransaction) {
  let amt: bigint;
  try {
    amt = BigInt(t.amount);
  } catch {
    amt = 0n;
  }
  const direction: WalletTransactionDirection =
    amt > 0n ? 'credit' : amt < 0n ? 'debit' : 'neutral';

  let summary: string;
  switch (t.type) {
    case 'transfer_in':
      summary = 'Incoming transfer (internal)';
      break;
    case 'transfer_out':
      summary = 'Outgoing transfer (internal)';
      break;
    case 'purchase':
      summary = 'Product purchase from catalog (internal currency)';
      break;
    case 'mkt_purchase':
      summary = 'Marketplace purchase (peer)';
      break;
    case 'mkt_sale':
      summary = 'Marketplace sale (peer)';
      break;
    case 'earn':
      summary = 'Credit (earn)';
      break;
    case 'adjustment':
      summary = 'Balance adjustment';
      break;
    default:
      summary = t.type;
  }

  return {
    id: t.id,
    userId: t.userId,
    type: t.type,
    amount: t.amount,
    currency: t.currency,
    note: t.note,
    counterpartyUserId: t.counterpartyUserId,
    productId: t.productId,
    listingId: t.listingId,
    offerId: t.offerId,
    direction,
    summary,
    createdAt:
      t.createdAt instanceof Date
        ? t.createdAt.toISOString()
        : (t.createdAt as unknown as string),
  };
}
