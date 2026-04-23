# Purchasing and peer-to-peer trading

This API uses an internal currency (default **`COIN`**, stored as integer **minor units** in wallets and prices). All authenticated calls below use the header:

```http
X-User-Id: <your-user-uuid>
```

Use a real UUID that exists in `users`. Socket.IO and some DB updates require valid UUIDs.

---

## 1. Shop purchase (global catalog)

Products are rows in the **`products`** table. List them:

```http
GET /products
```

Buy from the shop (debits your wallet and **adds the same items to your inventory**):

```http
POST /wallet/me/purchase
Content-Type: application/json

{
  "productId": "<product-uuid>",
  "quantity": 1
}
```

- **Ledger:** one row per checkout, type **`purchase`**, negative `amount`, `productId` set.
- **Inventory:** quantity is credited in **`user_inventory`** in the same database transaction.

Check balance:

```http
GET /wallet/me?currency=COIN
```

Check what you own:

```http
GET /marketplace/inventory/me
```

Response items include `product` and `quantity`.

---

## 2. List items for sale (seller)

You can only list stock you actually hold. Create a listing (this **reserves** quantity from your inventory onto the listing):

```http
POST /marketplace/listings
Content-Type: application/json

{
  "productId": "<same-catalog-product-uuid>",
  "quantity": 3,
  "unitPrice": "100",
  "currency": "COIN"
}
```

- `unitPrice` is **per unit**, minor units, as a **decimal string** (digits only), e.g. `"100"`.
- `currency` is optional; it defaults to the product’s currency.

Browse active listings:

```http
GET /marketplace/listings
GET /marketplace/listings/<listing-id>
```

Cancel the whole listing (seller only): voids **pending** offers, returns remaining listed stock to your inventory.

```http
POST /marketplace/listings/<listing-id>/cancel
```

---

## 3. Peer trade (buyer requests → seller confirms)

There is **no instant “buy”** that charges without the seller. Flow:

### Step A — Buyer places an offer

Reserves that many units on the listing (same as subtracting from `quantity_available`). Price is **snapshotted** from the listing’s `unitPrice` at offer time.

```http
POST /marketplace/listings/<listing-id>/offers
Content-Type: application/json

{
  "quantity": 1
}
```

`quantity` is optional; default is `1`.

The response is an **`marketplace_offers`** row with `status: "pending"`.

### Step B — Seller accepts or rejects

**Accept** (charges buyer, pays seller, delivers items to buyer’s inventory; writes ledger rows):

```http
POST /marketplace/offers/<offer-id>/accept
```

**Reject** (releases reservation back to the listing; no money moves):

```http
POST /marketplace/offers/<offer-id>/reject
```

### Step C — Buyer cancels while pending

```http
POST /marketplace/offers/<offer-id>/cancel
```

### Queues for UI

Pending sales (as seller):

```http
GET /marketplace/offers/selling
```

Pending purchases (as buyer):

```http
GET /marketplace/offers/buying
```

---

## 4. Money between users (not tied to a listing)

Simple internal transfer (pair of ledger rows on both sides):

```http
POST /wallet/me/transfer
Content-Type: application/json

{
  "toUserId": "<other-user-uuid>",
  "amount": "50",
  "currency": "COIN",
  "note": "optional"
}
```

Rules: positive integer `amount`, sufficient balance, cannot send to yourself.

---

## 5. Transaction history (pagination)

```http
GET /wallet/me/transactions?currency=COIN&limit=20
GET /wallet/me/transactions?currency=COIN&limit=20&cursor=<nextCursor-from-previous-response>
```

Response shape:

```json
{
  "items": [
    {
      "id": "...",
      "type": "purchase | mkt_purchase | mkt_sale | transfer_in | transfer_out | ...",
      "amount": "...",
      "currency": "COIN",
      "note": "...",
      "counterpartyUserId": "...",
      "productId": "...",
      "listingId": "...",
      "offerId": "...",
      "direction": "credit | debit | neutral",
      "summary": "...",
      "createdAt": "..."
    }
  ],
  "nextCursor": "uuid-or-null"
```

- **`purchase`** — shop buy (money out; inventory up).
- **`mkt_purchase` / `mkt_sale`** — peer trade **after seller accepted** an offer (`listingId`, `offerId` set when applicable).

---

## 6. Database migrations

New tables/columns for inventory, listings, offers, and `wallet_transactions.offer_id` are applied by migrations (e.g. **`0006_marketplace_inventory`**, **`0007_marketplace_offers`**). On Postgres:

```bash
npm run migration:run
```

Local SQLite with `DATABASE_SYNC=true` picks up schema from entities without running migrations.

---

## 7. Quick end-to-end example

1. User **A** earns or receives COIN (`POST /wallet/me/earn` or transfer).
2. **A** buys from shop: `POST /wallet/me/purchase` → has inventory.
3. **A** lists: `POST /marketplace/listings` with `productId`, `quantity`, `unitPrice`.
4. User **B** offers: `POST /marketplace/listings/<id>/offers` with `{ "quantity": 1 }`.
5. **A** accepts: `POST /marketplace/offers/<offer-id>/accept`.
6. **B** sees items in `GET /marketplace/inventory/me` and history in `GET /wallet/me/transactions`.

If **A** rejects or **B** cancels while pending, no payment occurs and listing availability is restored.
