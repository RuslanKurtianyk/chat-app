# Admin HTTP API (UA)

Операційні маршрути під **`/admin/*`** для керування продуктами, користувачами та гаманцями. Це **не** end-user JWT-флоу: доступ закритий спільним секретом у середовищі.

---

## Автентифікація

1. Задай **`ADMIN_API_KEY`** у змінних середовища (див. `.env.example`).
2. Для кожного запиту передавай заголовок:

```http
X-Admin-Api-Key: <таке саме значення як ADMIN_API_KEY>
```

| Ситуація | HTTP |
|----------|------|
| `ADMIN_API_KEY` не заданий | **503** — admin-роути вимкнені |
| Заголовок відсутній або неправильний | **403** — невірний або відсутній ключ |

Для JSON-body використовуй **`Content-Type: application/json`**.

---

## Products — `GET|POST /admin/products`, `GET|PATCH|DELETE /admin/products/:id`

| Метод | Шлях | Опис |
|------|------|------|
| `GET` | `/admin/products` | Пагінований список |
| `GET` | `/admin/products/:id` | Один продукт (UUID) |
| `POST` | `/admin/products` | Створити |
| `PATCH` | `/admin/products/:id` | Часткове оновлення |
| `DELETE` | `/admin/products/:id` | Видалити |

**Query params для списку**

- `page` — за замовчуванням `1`
- `limit` — за замовчуванням `20`, максимум `100`
- `active` — опційно: `true` (тільки активні) або `false` (тільки неактивні); якщо пропустити — всі

**Відповідь списку:** `{ items, total, page, limit }` (сортування за `createdAt` у спадному порядку).

**Body для create/update** (у PATCH усі поля опційні)

| Поле | Правила |
|------|---------|
| `name` | string, max 120 |
| `priceAmount` | невід’ємний integer string (minor units) |
| `imageUrl` | опційний URL, max 2048 |
| `currency` | опційно, string max 12 (часто `COIN`) |
| `active` | опційно boolean |

**Delete:** повертає **409 Conflict**, якщо продукт все ще використовується (інвентар, лістинги тощо).

---

## Users — `GET|POST /admin/users`, `GET|PATCH|DELETE /admin/users/:id`

| Метод | Шлях | Опис |
|------|------|------|
| `GET` | `/admin/users` | Пагінований список |
| `GET` | `/admin/users/:id` | Один користувач (UUID); **404** якщо не знайдено |
| `POST` | `/admin/users` | Створити |
| `PATCH` | `/admin/users/:id` | Часткове оновлення |
| `POST` | `/admin/users/:id/block` | Заблокувати (ban) акаунт |
| `DELETE` | `/admin/users/:id/block` | Розблокувати акаунт |
| `DELETE` | `/admin/users/:id` | Видалити |

**Query params:** `page` (default `1`), `limit` (default `20`, max `100`).

**Відповідь list/get:** “sanitized” користувач (**без** `passwordHash`). Список відсортований за `createdAt` у спадному порядку.

**Body для створення**

| Поле | Правила |
|------|---------|
| `mobile` | phone string (`class-validator` mobile) |
| `password` | мін. 8 символів |

**Body для оновлення** (усі поля опційні): `mobile`, `password`, `name` (max 200), `avatarUrl` (URL), `nickname` (max 50). Пароль перехешовується при оновленні.

### Блокування / розблокування

**POST `/admin/users/:id/block` body** (опційно):

| Поле | Правила |
|------|---------|
| `reason` | опційний рядок; зберігається в `users.blockedReason` |

Після блокування у користувача будуть поля:

- `isBlocked: true`
- `blockedAt: <timestamp>`
- `blockedReason: <reason|null>`

---

## Wallet — `/admin/wallet/*`

### `GET /admin/wallet/transactions`

Глобальний ledger, **новіші першими**, cursor pagination.

**Query params**

| Param | Опис |
|-------|------|
| `limit` | default `50`, max `100` |
| `cursor` | опційно: **id транзакції** (UUID) з останнього елемента попередньої сторінки; передавай `nextCursor` |
| `userId` | опційно: фільтр по користувачу |
| `currency` | опційно: напр. `COIN` |
| `type` | опційно: `adjustment`, `earn`, `transfer_in`, `transfer_out`, `purchase`, `mkt_purchase`, `mkt_sale` |

**Response:** `{ items, nextCursor }`.

### `GET /admin/wallet/accounts`

Пагінований список рахунків (баланс по user × currency).

**Query params:** `page`, `limit` (як вище), опційно `userId`, `currency`.

**Response:** `{ items, total, page, limit }`.

### `POST /admin/wallet/users/:userId/adjust`

Зарахувати або списати у **minor units** (integer string).

**Body**

| Поле | Правила |
|------|---------|
| `delta` | **Обов’язково.** Signed integer string: `+` = credit, `-` = debit |
| `currency` | Опційно; default `COIN`, max 12 |
| `note` | Опційно; max 500 (зберігається з префіксом `[admin]`) |

---

## Приклади

```bash
export ADMIN_KEY='your-secret'
export API='https://api.example.com'

# Заблокувати користувача
curl -sS -X POST -H "X-Admin-Api-Key: $ADMIN_KEY" -H 'Content-Type: application/json' \
  -d '{"reason":"spam"}' \
  "$API/admin/users/USER_UUID_HERE/block"

# Розблокувати користувача
curl -sS -X DELETE -H "X-Admin-Api-Key: $ADMIN_KEY" \
  "$API/admin/users/USER_UUID_HERE/block"
```

---

## Нотатки з безпеки

- Вважай **`ADMIN_API_KEY`** root-credential: довгий, випадковий, тільки на сервері та в довірених інструментах.
- По можливості обмеж доступ мережею / allowlist IP на проді; сам API перевіряє лише заголовок.

