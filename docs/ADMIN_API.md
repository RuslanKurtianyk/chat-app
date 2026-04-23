# Admin HTTP API

Operational routes under **`/admin/*`** for products, users, and wallets. They are **not** end-user JWT flows: access is gated by a shared secret in the environment.

---

## Authentication

1. Set **`ADMIN_API_KEY`** in the server environment (see `.env.example`).
2. On every request, send:

```http
X-Admin-Api-Key: <same value as ADMIN_API_KEY>
```

| Situation | HTTP |
|-----------|------|
| `ADMIN_API_KEY` is unset | **503** — admin routes are disabled |
| Header missing or wrong | **403** — invalid or missing key |

Use **`Content-Type: application/json`** for bodies.

---

## Products — `GET|POST /admin/products`, `GET|PATCH|DELETE /admin/products/:id`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/products` | Paginated list |
| `GET` | `/admin/products/:id` | One product (UUID) |
| `POST` | `/admin/products` | Create |
| `PATCH` | `/admin/products/:id` | Partial update |
| `DELETE` | `/admin/products/:id` | Delete |

**List query parameters**

- `page` — default `1`
- `limit` — default `20`, max `100`
- `active` — optional: `true` (only active) or `false` (only inactive); omit for all

**List response:** `{ items, total, page, limit }` (products ordered by `createdAt` descending).

**Create / update body** (PATCH: all fields optional)

| Field | Rules |
|-------|--------|
| `name` | string, max 120 |
| `priceAmount` | non-negative integer string (minor units) |
| `imageUrl` | optional URL, max 2048 |
| `currency` | optional string, max 12 (default in app is often `COIN`) |
| `active` | optional boolean |

**Delete:** returns **409 Conflict** if the product is still referenced (e.g. inventory or listings).

---

## Users — `GET|POST /admin/users`, `GET|PATCH|DELETE /admin/users/:id`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/users` | Paginated list |
| `GET` | `/admin/users/:id` | One user (UUID); **404** if missing |
| `POST` | `/admin/users` | Create |
| `PATCH` | `/admin/users/:id` | Partial update |
| `DELETE` | `/admin/users/:id` | Delete |

**List query parameters:** `page` (default `1`), `limit` (default `20`, max `100`).

**List / get response:** sanitized user objects (**no** `passwordHash`). Items ordered by `createdAt` descending on list.

**Create body**

| Field | Rules |
|-------|--------|
| `mobile` | phone string (`class-validator` mobile) |
| `password` | min 8 characters |

**Update body** (all optional): `mobile`, `password`, `name` (max 200), `avatarUrl` (URL), `nickname` (max 50). Password is re-hashed when provided.

---

## Wallet — `/admin/wallet/*`

### `GET /admin/wallet/transactions`

Global ledger, **newest first**, cursor pagination.

**Query parameters**

| Param | Description |
|-------|-------------|
| `limit` | default `50`, max `100` |
| `cursor` | optional: **transaction id** (UUID) from the previous page’s last item; pass `nextCursor` |
| `userId` | optional: filter to one user |
| `currency` | optional: e.g. `COIN` |
| `type` | optional: `adjustment`, `earn`, `transfer_in`, `transfer_out`, `purchase`, `mkt_purchase`, `mkt_sale` |

**Response:** `{ items, nextCursor }`. Each item is a JSON-safe ledger row: `id`, `userId`, `type`, `amount` (signed minor units string), `currency`, `note`, `counterpartyUserId`, `productId`, `listingId`, `offerId`, `direction` (`credit` \| `debit` \| `neutral`), `summary`, `createdAt` (ISO string).

### `GET /admin/wallet/accounts`

Paginated wallet accounts (balance per user × currency).

**Query parameters:** `page`, `limit` (same caps as above), optional `userId`, `currency`.

**Response:** `{ items, total, page, limit }`. Each item: `id`, `userId`, `mobile` (if joined), `currency`, `balance`, `createdAt`, `updatedAt`.

### `POST /admin/wallet/users/:userId/adjust`

Credit or debit a user in **minor units** (same integer string convention as the rest of the wallet).

**Body**

| Field | Rules |
|-------|--------|
| `delta` | **Required.** Signed integer string: positive = credit, negative = debit |
| `currency` | Optional; default `COIN`, max 12 chars |
| `note` | Optional; max 500 chars (stored with an `[admin]` prefix) |

**Behavior**

- Writes a ledger row with `type: adjustment`.
- Balance after the change must be **≥ 0**; otherwise **400** insufficient funds.
- `delta` must be non-zero (**400** if zero).

**Response:** updated wallet account entity (including new `balance`).

---

## Examples

Replace `https://api.example.com` and values as needed.

```bash
export ADMIN_KEY='your-secret'
export API='https://api.example.com'

# List products (active only)
curl -sS -H "X-Admin-Api-Key: $ADMIN_KEY" \
  "$API/admin/products?active=true&limit=10"

# Create product
curl -sS -X POST -H "X-Admin-Api-Key: $ADMIN_KEY" -H 'Content-Type: application/json' \
  -d '{"name":"Badge","priceAmount":"100","currency":"COIN","active":true}' \
  "$API/admin/products"

# Credit user wallet
curl -sS -X POST -H "X-Admin-Api-Key: $ADMIN_KEY" -H 'Content-Type: application/json' \
  -d '{"delta":"5000","currency":"COIN","note":"promo"}' \
  "$API/admin/wallet/users/USER_UUID_HERE/adjust"

# Next page of transactions
curl -sS -H "X-Admin-Api-Key: $ADMIN_KEY" \
  "$API/admin/wallet/transactions?limit=50&cursor=PASTE_NEXT_CURSOR"
```

---

## Security notes

- Treat **`ADMIN_API_KEY`** like a root credential: long, random, only on the server and in trusted tooling.
- Prefer restricted networks or IP allowlists in production if your host supports them; the API itself only checks the header.
