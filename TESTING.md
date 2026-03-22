# Testing the chat app

You have three ways to test; **you do not need to build a full client** for automated or manual testing.

---

## 1. Unit tests (no client)

Run service and controller logic in isolation with mocks:

```bash
npm run test
```

- **What it runs:** `*.spec.ts` next to each service/controller (e.g. `chats.service.spec.ts`, `chats.controller.spec.ts`).
- **Use it for:** business rules (e.g. only creator/admin can update chat), validation, edge cases.
- **You don’t need a client:** everything is in-process with Jest.

---

## 2. E2E tests (no UI client)

Run the real app and call HTTP + WebSockets from Node:

```bash
npm run test:e2e
```

- **REST:** use `supertest` to call `POST /chats`, `GET /chats`, etc., with headers (e.g. `X-User-Id`).
- **WebSockets:** use `socket.io-client` in the test to connect, emit `sendMessage`, `joinChat`, and assert on events.
- **You don’t need a client:** the test file is the “client”; good for CI and regression.

Example pattern:

- Start the app with `createNestApplication()` and `app.listen(0)`.
- `request(app.getHttpServer()).post('/chats').set('X-User-Id', '1').send({ name: 'Test', isPrivate: false })`.
- `io.connect(...)` then `socket.emit('joinChat', { chatId })` and `socket.on('messageCreated', ...)`.

---

## 3. Manual testing with the minimal client

For clicking around in the browser without writing your own app:

1. Start the server: `npm run start:dev`
2. Open **http://localhost:3000/test-client.html** in your browser (the server serves the `client/` folder).
3. Set **User ID** (must match a user id in your DB; e.g. `1`).
4. Use the form to create chats, search public, join/leave, and send messages over WebSocket.

**You don’t have to write a client:** this page is a minimal client for manual testing. When you’re ready, you can replace it with a real frontend (React, Vue, etc.) that uses the same REST and WebSocket API.

---

## Summary

| Goal                    | Use this                         | Write a client?   |
|-------------------------|----------------------------------|--------------------|
| CI / automated checks   | Unit + E2E tests                 | No                 |
| Quick manual check      | Minimal client (test-client.html)| No (it’s provided) |
| Real product UI         | Your own frontend                | Yes (later)        |
