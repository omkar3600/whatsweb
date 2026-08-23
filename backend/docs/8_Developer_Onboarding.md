# Section 8: Developer Onboarding & Knowledge Transfer

Welcome to the WhatsHub engineering team! This guide will help you understand how to navigate and modify the codebase safely.

## 8.1 New Developer Onboarding

### Where to Start
1. **Read `schema.prisma`:** The database schema is the ultimate source of truth. Understand the relationship between `Shop`, `Contact`, `Campaign`, and `Message`.
2. **Review `whatsapp.service.ts`:** This is the heart of the system. Look at `handleIncomingMessage` to understand how external data enters the system.
3. **Review `campaign.processor.ts`:** This file demonstrates how we handle massive data processing without crashing the server.

### Coding Standards
- **Strict Typing:** Avoid `any` in TypeScript. Use newly defined DTOs (`contacts.dto.ts`, `auth.dto.ts`).
- **No Blocking I/O:** Never use synchronous file operations (`fs.appendFileSync`). Use `Logger`.
- **Database Rules:** Always include `shopId` in your Prisma `where` clauses to prevent cross-tenant data leaks.

### Development Process
1. Test your code locally.
2. If modifying Prisma, run `npx prisma format` and `npx prisma db push`.
3. Check the `/health` endpoint to ensure the database didn't drop connections.

## 8.2 Technical Debt & Known Limitations

While the system has been hardened for production, future scaling may require:
1. **Prisma Connection Pooling:** As the app scales to hundreds of concurrent users, Prisma might exhaust PostgreSQL connections. **Recommendation:** Implement PgBouncer.
2. **File Storage:** Media uploads are currently saved to local disk (`/uploads`). This breaks horizontal scaling (adding more backend servers). **Recommendation:** Migrate local uploads to AWS S3 or Supabase Storage.
3. **Analytics Aggregation:** Counting `CampaignContact` statuses dynamically is currently optimized out for completed campaigns, but real-time counts for active campaigns might slow down if the campaign has millions of users. **Recommendation:** Add a Redis-backed counter that syncs to DB periodically.

## 8.3 Feature Catalog

| Feature | Business Value | APIs Involved | Backend Workflow |
|---|---|---|---|
| **Multi-Agent Inbox** | Allows teams to collaborate on support. | `GET /conversations`, WebSocket `new_message` | Webhooks parse message -> DB -> Socket emits. |
| **Campaign Broadcasting** | Marketing at scale. | `POST /campaigns` | BullMQ loops via cursor pagination -> WhatsApp API. |
| **Drip Sequences** | Automate lead nurturing over days/weeks. | `POST /sequences` | Tag trigger -> BullMQ Delayed Job -> WhatsApp API. |
| **Flow Builder** | Interactive chatbots without code. | `POST /flows` | Incoming message -> Node Graph execution engine -> Reply. |
| **Embedded Signup** | Fast user onboarding. | `POST /embedded-signup` | OAuth -> Meta API token exchange -> Phone registration. |

---
*End of Knowledge Transfer Guide.*
