# Section 2: Complete Architecture Documentation

## 2.1 System Architecture

WhatsHub utilizes a standard decoupled client-server architecture augmented with background workers and real-time WebSockets.

- **Frontend Architecture:** Next.js Server-Side Rendered (SSR) Application serving Static Assets and API Proxies. State is managed locally via React Hooks and Zustand, with Axios handling backend communication.
- **Backend Architecture:** A modular NestJS monolith. The application is divided into highly cohesive domain modules (Auth, Contacts, Campaigns, etc.). It heavily relies on Dependency Injection.
- **Database Architecture:** Relational PostgreSQL database managed via Prisma ORM. Features strict foreign key constraints, cascading deletes, and performance indexes on high-traffic queries.
- **Queue Architecture:** Redis-backed BullMQ handles all heavy lifting (Campaign broadcasting, Sequence delays) asynchronously to prevent HTTP blocking.
- **Real-Time Architecture:** Socket.io Gateway running within NestJS, pushing events (`new_message`, `message_status`) to authenticated frontend clients.
- **Storage Architecture:** Local file storage (`/uploads`) for media with an abstraction layer ready for S3/Cloudflare R2 migration.
- **Authentication Architecture:** Secure `HttpOnly` JWT Cookies. Passwords are hashed with bcrypt.

### System Flow Diagram
```text
[ User / Browser ] <--(HTTPS/WSS)--> [ Nginx / Load Balancer ]
                                           |
                                   [ Next.js Frontend ]
                                           |
                                    [ NestJS Backend ]
                                     /      |       \
                      [ PostgreSQL ]    [ Redis ]   [ Meta WhatsApp API ]
                                            |
                                  [ BullMQ Workers ]
```

---

## 2.2 Project Structure Documentation

### Frontend (`/frontend`)
- `/src/app`: Next.js App Router pages (e.g., `/dashboard`, `/inbox`).
- `/src/components`: Reusable UI components (Buttons, Modals, Forms).
- `/src/lib`: Utilities, API interceptors (`api.ts`), and helpers.
- `/src/store`: Zustand state management stores.

### Backend (`/backend`)
- `/src/common`: Global filters, guards, and decorators (`global-exception.filter.ts`).
- `/src/prisma`: Prisma ORM client service.
- `/src/auth`: JWT authentication, Guards, and login/register controllers.
- `/src/whatsapp`: Meta Webhook ingestion, API communication.
- `/src/campaigns`: Bulk messaging logic and BullMQ Processor.
- `/src/flows`: Flow builder logic and execution engine.
- `/src/sequences`: Drip campaign automation logic.
- `/src/contacts`: Contact management and Excel imports.
- `/src/chat`: WebSocket Gateway for real-time inbox.

---

## 2.3 Complete Module Documentation

### Auth Module (`/src/auth`)
- **Purpose:** Handles user registration, login, and JWT cookie issuance.
- **Services:** `AuthService`, `JwtStrategy`.
- **Controllers:** `AuthController`.

### WhatsApp Module (`/src/whatsapp`)
- **Purpose:** Ingests webhooks from Meta, sends outbound API requests.
- **Dependencies:** `PrismaService`, `ChatbotService`, `FlowsService`, `ConfigService`.
- **Key Files:** `whatsapp.controller.ts` (Webhook receiver), `whatsapp.service.ts` (Idempotency and routing).

### Campaigns Module (`/src/campaigns`)
- **Purpose:** Manages bulk broadcasts.
- **Services:** `CampaignsService`, `CampaignProcessor` (BullMQ Worker).
- **Database Tables:** `Campaign`, `CampaignContact`.

### Flows Module (`/src/flows`)
- **Purpose:** Visual node-based workflow processing.
- **Services:** `FlowsService`.
- **Key Logic:** Parses JSON node-graphs and executes them sequentially based on user replies.

### Chat Module (`/src/chat`)
- **Purpose:** Real-time WebSockets.
- **Services:** `ChatGateway`.

### Sequences Module (`/src/sequences`)
- **Purpose:** Time-based drip messaging (e.g., Send Message -> Wait 2 days -> Send Message).
- **Dependencies:** BullMQ (`sequences` queue).
