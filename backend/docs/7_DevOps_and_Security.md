# Section 7: DevOps, Deployment & Security

## 7.1 Configuration Documentation (.env)

The system relies heavily on environment variables.

| Variable | Purpose | Security Consideration |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | **CRITICAL:** Contains DB password. Never expose. |
| `JWT_SECRET` | Used to sign Auth cookies | **CRITICAL:** If leaked, attackers can forge admin sessions. |
| `REDIS_HOST`, `PORT` | Connects BullMQ to Redis | Private networking only. |
| `META_APP_ID`, `SECRET` | Facebook OAuth integration | Required for Embedded Signup. |
| `WHATSAPP_VERIFY_TOKEN`| Validates Meta Webhook | Must match string in Meta App dashboard. |
| `GROQ_API_KEY` | Connects Chatbot to LLM | Rotate if leaked. |

## 7.2 Deployment Setup

The application is containerized using Docker.

### Local Development Setup
1. Copy `.env.example` to `.env` and fill variables.
2. Run `npm install` in both `/frontend` and `/backend`.
3. Run `npx prisma db push` in backend.
4. Run `docker-compose up -d redis` to start local Redis.
5. Run `npm run dev` in both directories.

### Production Setup
1. Clone repository to server.
2. Create production `.env` file.
3. Run `docker-compose up -d --build`. This spins up:
   - `postgres-db`
   - `redis-cache`
   - `backend-api` (NestJS)
   - `frontend-app` (Next.js)
4. Expose ports 3000 (Frontend) and 3001 (Backend) to an Nginx reverse proxy.
5. Assign SSL via Let's Encrypt. Webhooks MUST use HTTPS.

## 7.3 Security Documentation

1. **Token Management:** The system is **100% cookie-based**. No JWTs are exposed to JavaScript (`localStorage`), eliminating XSS token theft vectors.
2. **Global Exception Hiding:** `GlobalExceptionFilter` intercepts all 500 errors. In `NODE_ENV=production`, it logs the stack trace to the server console but returns a generic "Internal Server Error" to the API client, preventing infrastructure leakage.
3. **Webhook Verification:** Incoming Meta Webhooks validate the `hub.verify_token` against the environment variable.
4. **Data Isolation (Multi-Tenancy):** The `ActiveShopInterceptor` strictly intercepts every authenticated request, extracting `user.shopId` from the JWT and injecting it into the controller. Developers cannot accidentally query data belonging to a different shop because `shopId` is forcefully applied at the application edge.
5. **Secure Cryptography:** Hardcoded passwords/PINs are banned. The WhatsApp registration API uses a randomized cryptographically secure PIN generator (`crypto.randomInt`).

## 7.4 Monitoring & Troubleshooting

### Troubleshooting Guide

**Symptom:** Campaign is stuck in "Scheduled" status, nothing sends.
**Root Cause:** BullMQ worker is not processing, usually because Redis is down or misconfigured.
**Resolution:** Check `docker logs redis-cache`. Verify `REDIS_HOST` in `.env`.

**Symptom:** Webhooks not arriving (no messages in Inbox).
**Root Cause:** Meta dashboard is pointing to the wrong URL, or HTTPS is broken.
**Resolution:** Ensure Nginx is proxying `/api/whatsapp/webhook` correctly and SSL is valid.

**Symptom:** "N+1 Query / Out of Memory" during Campaign Dashboard Load.
**Resolution (Fixed):** The application now relies on pre-calculated `stats` JSON on the Campaign object. Ensure you are not removing the optimization in `getCampaigns` inside `campaigns.service.ts`.
