# Deploy: Render + Supabase + Cloudinary

## 1. Supabase (PostgreSQL)

1. Create a project at [supabase.com](https://supabase.com).
2. **Settings → Database → Connection string**  
   - Use **URI**.  
   - For a long‑running Node server on Render, **Session mode** (port `5432`) or **Transaction pooler** (port `6543`) both work; pooler is better at scale.
3. Copy the connection string and replace `[YOUR-PASSWORD]` with the database password.
4. Add to Render as **`DATABASE_URL`** (see below).

### `ENETUNREACH` / IPv6 (`2a05:...:5432`)

Якщо в логах з’єднання йде на **IPv6** і падає з **`ENETUNREACH`**, на Render зазвичай **немає маршруту до IPv6**. У цьому репо в **`main.ts`** за замовчуванням увімкнено **`dns.setDefaultResultOrder('ipv4first')`**, щоб `pg` брав **IPv4** з DNS, якщо він є.

Якщо проблема лишається:

- У Supabase візьми рядок підключення **Session pooler** або **Transaction pooler** (інший хост/порт, частіше стабільніший за direct).
- Або в Render → Environment додай **`NODE_OPTIONS`** = `--dns-result-order=ipv4first` (дублює ефект; зазвичай не потрібно, якщо вже є правка в `main.ts`).
- Тимчасово вимкнути пріоритет IPv4 у коді: **`DATABASE_DNS_IPV4_FIRST=false`**.

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
   **Start command:** `npm run start:prod`
3. **Health check path:** `/health`
4. **Environment variables:**

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Supabase URI |
| `NODE_ENV` | Yes | `production` |
| `JWT_SECRET` | Yes | Strong random string |
| `DATABASE_SYNC` | For first deploy | `true` once, then `false` |
| `DATABASE_SSL` | Usually no | Auto for `supabase.co` in URL |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `CLOUDINARY_FOLDER` | No | Folder in Cloudinary (default `chat-app`) |
| `CLOUDINARY_SECURE` | No | `true` (default) |
| `CORS_ORIGIN` | If browser calls API | Через кому: прод-фронт + за потреби `http://localhost:5173` |
| `CORS_ALLOW_LOCALHOST` | Опційно | `true` — дозволити типові `http://localhost:*` / `127.0.0.1` (див. `src/cors-settings.ts`) разом із `CORS_ORIGIN` |
| `PORT` | No | Set by Render |

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
