# Section 6: Frontend & Integrations Documentation

## 6.1 Frontend Documentation

The frontend is a Next.js 14 application using the App Router.

### Routing Map
- `/login` -> Authentication page.
- `/register` -> Registration page.
- `/dashboard` -> Main overview metrics.
- `/dashboard/inbox` -> Real-time WebSocket chat interface.
- `/dashboard/contacts` -> Contact list and Excel import module.
- `/dashboard/campaigns` -> Bulk messaging creation and analytics.
- `/dashboard/flows` -> Visual node-editor for Chatbots.
- `/dashboard/settings` -> Meta API integration setup, billing, profile.

### State Management
- **Zustand:** Used for global state that needs to survive unmounts (e.g., currently selected conversation in the inbox).
- **React Query (SWR / Custom Hooks):** Used for fetching data from the backend and caching responses.

### Key Components
- `providers.tsx`: Wraps the app in Auth/Context providers. Extracts user state.
- `api.ts`: Global Axios instance. Intercepts 401s to redirect to `/login`. Relies entirely on `withCredentials: true` for passing HttpOnly cookies.

---

## 6.2 External Integrations

### Meta WhatsApp Cloud API
- **Purpose:** Sending and receiving all WhatsApp messages.
- **Authentication:** `Bearer` token (Permanent System User Token from Meta App).
- **Usage:** Outbound messages sent via `POST https://graph.facebook.com/v20.0/{phone_id}/messages`.
- **Failure Handling:** Returns Axios Error. Backend catches, logs reason in `failureHistory`, and updates DB status to `failed`.

### Groq AI
- **Purpose:** LLM-powered conversational agent (Chatbot).
- **Authentication:** `GROQ_API_KEY`.
- **Usage:** Takes user message, system prompt, and context, streams or returns generated response to send back to WhatsApp.

### PostgreSQL (Supabase/Neon)
- **Purpose:** Relational Data Storage.
- **Connection:** Prisma ORM via `DATABASE_URL` (requires pooled connection string, typically ending in `?pgbouncer=true` if using Supabase).

### Redis
- **Purpose:** Pub/Sub for WebSockets, Job Queues for BullMQ.
- **Usage:** Fast, ephemeral storage.

---

## 6.3 Queues & Background Jobs

BullMQ handles heavy processing to prevent API timeout.

- **`campaigns` Queue:** Processes bulk message lists. Retry mechanism: disabled natively, custom `resendFailed` API allows manual retry.
- **`sequences` Queue:** Handles delayed drip marketing. Allows scheduling jobs days/weeks into the future.
- **`flows` Queue:** Processes complex node-trees to prevent locking the webhook processor.
