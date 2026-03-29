# Deploy: Render + Supabase + Cloudinary

## 1. Supabase (PostgreSQL)

1. Create a project at [supabase.com](https://supabase.com).
2. **Settings → Database → Connection string** → вкладка / режим **URI**.

### Render = IPv4-only → не Direct connection

У дашборді Supabase для **Direct** часто видно підказку на кшталт **«Not IPv4 compatible»**: такий хост може бути **лише через IPv6**. **Render не маршрутизує IPv6** до зовнішніх сервісів → **`ENETUNREACH`** і нескінченні ретраї TypeORM.

**Що робити (без платного IPv4 add-on):**

- У тому ж розділі Connection string обери **Session pooler** (Supabase прямо рекомендує його для **IPv4-мереж**).
- Скопіюй **URI** (хост зазвичай `*.pooler.supabase.com`, не `db.*.supabase.co`), підстав пароль замість `[YOUR-PASSWORD]`.
- Встав у Render як **`DATABASE_URL`**.

**Transaction pooler** (порт **6543**) теж підходить для багатьох бекендів на Node; якщо щось ламається з prepared statements / сесіями — спробуй **Session pooler** згідно з підказкою в UI.

Платний **IPv4 add-on** у Supabase потрібен лише якщо свідомо хочеш саме **Direct** з IPv4-мережі.

### `ENETUNREACH` / IPv6 (`2a05:...:5432`)

На Render часто **немає IPv6**; деякі хости Supabase в DNS мають **лише AAAA** — тоді **`ipv4first` не допомагає** (немає A-запису), і `pg` усе одно йде в IPv6.

У проєкті зроблено два кроки:

1. **`main.ts`**: `dns.setDefaultResultOrder('ipv4first')` — якщо є і A, і AAAA.
2. **`app.module` + `postgres-ipv4-host.ts`**: перед підключенням TypeORM викликається **`dns.promises.lookup(host, { family: 4 })`**; якщо знайдено IPv4, з’єднання йде **на IP**, а для TLS у **`ssl.servername`** лишається **оригінальний hostname** (сертифікат Supabase валідний).

Якщо після деплою все одно помилка:

- У Supabase візьми URI **Transaction pooler** (порт **6543**) або **Session pooler** — у них часто інший DNS з нормальним IPv4.
- Якщо для твого direct-хоста **взагалі немає A-запису**, лише AAAA — код відкотиться на звичайний `DATABASE_URL` і знову буде ENETUNREACH; тоді **обов’язково** pooler або інший host.

Опційно: **`DATABASE_IPV4_LOOKUP=false`** — вимкнути резолв IPv4 у TypeORM (лише для діагностики). **`DATABASE_DNS_IPV4_FIRST=false`** — вимкнути лише крок 1.

Якщо для **direct** `db.*.supabase.co` **ніде** немає A-запису (навіть через 1.1.1.1), застосунок при старті викине **зрозумілу помилку** — тоді **обов’язково** постав **`DATABASE_URL` з pooler** (нижче). Опційно свої DNS для резолву: **`DATABASE_DNS_SERVERS=1.1.1.1,8.8.8.8`**.

### First-time schema

- With **`DATABASE_SYNC=false`** (default in production), TypeORM will **not** create tables.
- **Option A — one-time sync:** set **`DATABASE_SYNC=true`** in Render, deploy once, confirm tables exist in Supabase **Table Editor**, then set **`DATABASE_SYNC=false`** and redeploy.
- **Option B — migrations:** keep `DATABASE_SYNC=false` and add TypeORM migrations (recommended long-term).

## 2. Cloudinary (files)

1. Create a project at [cloudinary.com](https://cloudinary.com).
2. Copy **Cloud Name** → **`CLOUDINARY_CLOUD_NAME`** on Render.
3. Copy **API Key** → **`CLOUDINARY_API_KEY`** on Render.
4. Copy **API Secret** → **`CLOUDINARY_API_SECRET`** on Render.
5. (Optional) Set folder prefix → **`CLOUDINARY_FOLDER`** (default `chat-app`).

### API (optional)

- `GET /storage/cloudinary` — returns `cloudName`, `folder` and `uploadPreset` (if configured).
- Legacy routes `/storage/uploadcare` and `/storage/uploadcare/signed-upload` are kept but return “replaced by Cloudinary”.

### Chat file messages (server uploads to Cloudinary)

- **`POST /messages/upload`** — `multipart/form-data`: field **`file`** (required), **`chatId`** (required), optional **`content`** (caption), **`replyToId`**.
- Headers: **`X-User-Id`** (same as other routes).
- The server uploads the file to Cloudinary and saves **`attachmentUrl`** (Cloudinary `secure_url`), **`attachmentMimeType`**, **`originalFilename`** on the message.
- Large files: prefer HTTP upload. WebSocket event **`sendMessageWithFile`** accepts base64 (limit **`WS_MAX_FILE_BYTES`**, default 2MB).

## 3. Render (host)

### Manual Web Service

1. **New → Web Service**, connect this repo.
2. **Build command:** `npm ci --include=dev && npm run build`  
   (Якщо на сервісі задано `NODE_ENV=production`, звичайний `npm ci` **не** ставить devDependencies → **`nest: not found`**. Прапор `--include=dev` це виправляє.)  
   **Start command:** `npm run start:prod:migrate` (спочатку виконує `migration:run`, потім стартує сервер)
3. **Health check path:** `/health`
4. **Environment variables:**

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Supabase URI |
| `NODE_ENV` | Yes | `production` |
| `JWT_SECRET` | Yes | Strong random string |
| `DATABASE_SYNC` | Usually no | Тримай `false` у проді. Схему застосовують міграції (`migration:run`). |
| `DATABASE_SSL` | Usually no | Auto for `supabase.co` in URL |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `CLOUDINARY_FOLDER` | No | Folder in Cloudinary (default `chat-app`) |
| `CLOUDINARY_SECURE` | No | `true` (default) |
| `CORS_ORIGIN` | If browser calls API | Через кому: **точний** `Origin` фронту (без шляху в кінці). Приклад: `https://your-api.onrender.com,https://ruslankurtianyk.github.io` — другий пункт потрібен для **GitHub Pages**. |
| `CORS_ALLOW_LOCALHOST` | Опційно | `true` — додати типові `http://localhost:*` / `127.0.0.1` до списку разом із `CORS_ORIGIN` |

### CORS і GitHub Pages (`*.github.io`)

Браузер шле заголовок **`Origin: https://ruslankurtianyk.github.io`** (без `/` в кінці, без шляху до репо). Якщо на Render задано **`CORS_ORIGIN`** без цього значення, зі сторінки на GitHub буде **CORS error**.

1. Render → твій Web Service → **Environment**.
2. **`CORS_ORIGIN`** = через кому всі дозволені фронти, наприклад:  
   `https://<твій-сервіс>.onrender.com,https://ruslankurtianyk.github.io`  
   (якщо HTML на GitHub лише кличе API на Render, достатньо одного `https://ruslankurtianyk.github.io` — але зазвичай лишають і Render, якщо звідти теж відкривають клієнт.)
3. **Save** → **Manual Deploy** (або дочекайся redeploy).

У тестовому HTML на GitHub у полі **API base** має бути **`https://<твій-сервіс>.onrender.com`** (HTTPS, без слешу в кінці). Socket.IO піде на той самий хост.

Якщо **`CORS_ORIGIN` порожній** — у коді вмикається permissive CORS і GitHub має проходити; проблема з’являється саме коли список origin **явний**, але без `github.io`.
| `PORT` | No | Set by Render |

### API документація (Swagger)

- Після деплою відкрий `https://<service>.onrender.com/api-docs`
- В UI буде показано всі ендпоінти; для “авторизованих” (де потрібен `X-User-Id`) використовуй заголовок:
  - `X-User-Id: <user uuid>`

5. **WebSockets:** Render supports WebSockets on HTTP services; use the same URL as REST (e.g. `wss://your-service.onrender.com`) for Socket.IO.

### Blueprint

Use **`render.yaml`** in the repo: **New → Blueprint** and connect the repository. Then set secret env vars in the Render dashboard (`DATABASE_URL`, keys, etc.).

## 4. Local development

- **Without `DATABASE_URL`:** app uses **SQLite** (`data/chat.sqlite`) as before.
- **With `DATABASE_URL`:** app uses **Postgres** (can point to Supabase dev branch or local Docker Postgres).

Copy `.env.example` → `.env` and fill values.

```bash
cp .env.example .env
npm run start:dev
```

## 5. Client / test page

Static files are served from `/` (e.g. `https://<service>.onrender.com/test-client.html`).  
If the frontend is on another origin, set **`CORS_ORIGIN`** accordingly.
