# Section 5: Business Logic Documentation

## 5.1 Incoming Message Processing
**Step-by-Step Flow:**
1. Meta sends an HTTP POST Webhook to `POST /whatsapp/webhook`.
2. `WhatsappController` verifies the payload structure.
3. `WhatsappService.handleIncomingMessage` looks up the `Shop` by `whatsappPhoneId`.
4. It checks for **Idempotency** (checking if `wamid` already exists in `Message` table). If duplicate, aborts to prevent loop.
5. If new, it creates/updates the `Contact` and `Conversation` records.
6. Saves the `Message` to PostgreSQL.
7. Evaluates AI Chatbot rules (`ChatbotService`).
8. Evaluates Flow builder triggers (`FlowsService`).
9. Emits a WebSocket `new_message` event to the Frontend.

## 5.2 Campaign Execution
**Step-by-Step Flow:**
1. User clicks "Send Campaign" in Frontend.
2. `POST /campaigns` creates a `Campaign` record with `status: scheduled`.
3. Adds a job to BullMQ `campaigns` queue with a delay (if scheduled in future) or fires immediately.
4. `CampaignProcessor` picks up the job.
5. Processor uses **Cursor Pagination** to fetch contacts in batches of 1000 from the database.
6. Filters contacts in memory (by Tags, Cities, No-Message days).
7. Pauses `sendDelay` milliseconds to respect rate limits.
8. Calls Meta API to send the Template Message.
9. Creates a `CampaignContact` record (status: `sent` or `failed`).
10. At the end of all batches, marks Campaign as `completed`.

## 5.3 Sequence Processing
**Step-by-Step Flow:**
1. A Contact is updated with a specific tag (e.g., "new_lead").
2. `ContactsService` triggers `SequencesService.handleContactTagsUpdated`.
3. Service finds Sequences matching the trigger tag.
4. Loops through Sequence Steps. If a step has a 2-day delay, it enqueues a job to BullMQ `sequences` queue with `delay = 48 hours`.
5. 48 hours later, `SequenceProcessor` wakes up, verifies the tag still exists, and sends the template.

## 5.4 Embedded Signup (WhatsApp Onboarding)
**Step-by-Step Flow:**
1. User clicks "Connect Facebook" in frontend (loads Facebook JS SDK).
2. Completes OAuth, grants permissions, selects WABA account.
3. Frontend receives an `accessToken` and sends it to `POST /embedded-signup/exchange-token`.
4. Backend verifies token, fetches WABA details, registers phone numbers.
5. Generates a secure, random 6-digit PIN and registers the phone to the WhatsApp Cloud API.
6. Updates `Shop` config with `whatsappAccountId` and `whatsappPhoneId`.

## 5.5 Authentication & Authorization
**Login Flow:**
1. `POST /auth/login` checks credentials.
2. Returns a JWT signed by `ConfigService(JWT_SECRET)`.
3. Intercepts response and attaches JWT as an `HttpOnly`, `Lax`, `Secure` cookie.
4. Future requests automatically send the cookie. `JwtStrategy` extracts the cookie and validates the signature.
5. Request is authorized. `ActiveShopInterceptor` ensures `user.shopId` is attached to requests to prevent cross-tenant data leaks.
