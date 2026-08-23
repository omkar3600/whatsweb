# Section 3: API Documentation

*Note: All backend endpoints are prefixed with `/api` via the global prefix in `main.ts` or reverse proxy.*

## Authentication Endpoints

### `POST /auth/register`
- **Purpose:** Registers a new shop and admin user.
- **Auth Required:** No.
- **Request Body:** `RegisterShopDto` (`username`, `password`, `shopName`, `phone`).
- **Response:** User object (excluding password).

### `POST /auth/login`
- **Purpose:** Authenticates user and sets `HttpOnly` JWT cookie.
- **Auth Required:** No.
- **Request Body:** `LoginDto` (`username`, `password`).
- **Response:** `200 OK` (Cookie set automatically).

### `POST /auth/logout`
- **Purpose:** Clears the JWT cookie.
- **Response:** `{ message: "Logged out successfully" }`

---

## WhatsApp Endpoints

### `GET /whatsapp/webhook`
- **Purpose:** Meta API Verification endpoint.
- **Query Params:** `hub.mode`, `hub.challenge`, `hub.verify_token`.

### `POST /whatsapp/webhook`
- **Purpose:** Ingests incoming messages and delivery statuses from Meta.
- **Request Body:** Meta Webhook Payload.
- **Internal Services:** `WhatsappService.handleIncomingMessage`, `handleMessageStatus`.

---

## Contacts Endpoints

### `GET /contacts`
- **Purpose:** Retrieves paginated contacts for a shop.
- **Auth Required:** Yes (JWT).
- **Query Params:** `page`, `limit`, `search`.
- **Response:** `{ data: Contact[], total: number, page: number, totalPages: number }`

### `POST /contacts/import`
- **Purpose:** Imports contacts via Excel/CSV.
- **Request Body:** `multipart/form-data` with `file`.
- **Response:** `{ imported: number, skipped: number, errors: string[] }`

---

## Campaigns Endpoints

### `POST /campaigns`
- **Purpose:** Schedules a new bulk broadcast.
- **Auth Required:** Yes.
- **Request Body:** `name`, `templateId`, `targetTags`, `scheduledAt`, `sendNow`.
- **Side Effects:** Dispatches a BullMQ Job to the `campaigns` queue.

### `GET /campaigns`
- **Purpose:** Lists campaigns and their live delivery statistics.
- **Response:** Array of Campaigns with merged stats (Total, Sent, Delivered, Read, Failed).

### `POST /campaigns/:id/resend-failed`
- **Purpose:** Creates a clone campaign targeting ONLY contacts that failed in the original campaign.

---

## Health Check

### `GET /health`
- **Purpose:** Zero-downtime deployment probe. Tests DB connectivity.
- **Response:** `{ status: 'ok', database: 'connected' }`
