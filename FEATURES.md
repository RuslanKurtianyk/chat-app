# Перевірка фіч чат-додатку

## Потрібні фічі (згідно з вашим списком)

| Фіча | Статус | HTTP | WebSocket | Примітки |
|------|--------|------|-----------|----------|
| **Чати** | ✅ | ✅ ChatsController | ✅ ChatsGateway | join/leave, myChats, public search |
| **Групи** | ✅ | ✅ через Chats | ✅ через Chats | `isGroup: true`; обкладинка групи: `imageUrl` або `POST /chats/:id/image` |
| **Marketplace (P2P)** | ✅ | `GET/POST /marketplace/*` | — | покупець `.../offers`, продавець `.../accept` / `reject` (гроші + товар після підтвердження) |
| **Профіль** | ✅ | ✅ GET/PATCH /users/me | — | логотип (avatarUrl), нікнейм, активність (lastActiveAt) |
| **Індикатор активності** | ✅ | lastActiveAt у профілі | ✅ userOnline / userOffline (PresenceGateway) | оновлення при підключенні WS |
| **Дзвінки** | ✅ | ✅ CallsController | ✅ CallsGateway | startCall, endCall, callSignal |
| **Сторіз** | ✅ | ✅ StoriesController | ✅ StoriesGateway | createStory, getStories, expiresAt |
| **Папки** | ✅ | ✅ FoldersController | ✅ FoldersGateway | папки чатів, addChat/removeChat |
| **Геолокація** | ✅ | ✅ GeolocationController | ✅ GeolocationGateway | share, route/today (маршрут за день) |

## Профіль (вимоги)

- **Логотип** — ✅ `User.avatarUrl` (PATCH /users/me)
- **Нікнейм** — ✅ `User.nickname` (PATCH /users/me)
- **Активність** — ✅ `User.lastActiveAt` (оновлюється при активності; GET /users/me)

## Доступ HTTP + WebSocket

- Усі перелічені фічі доступні і по **HTTP** (REST), і по **WebSockets** (Socket.IO), де це має сенс.

## Тестовий клієнт

- **client/test-client.html** — простий клієнт для тестування всіх фіч (профіль, auth, чати, повідомлення, активність, дзвінки, сторіз, папки, геолокація).
- Запуск: `npm run start:dev`, далі відкрити `http://localhost:3000/test-client.html`.
- Спочатку Sign up (Auth), потім вставити повернутий `user.id` у поле User ID.
