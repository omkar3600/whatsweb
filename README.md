# WhatsHub

WhatsHub is a WhatsApp Marketing & Automation Platform featuring a NestJS backend and Next.js frontend with AI Chatbot integration.

## Architecture

- **`backend/`**: NestJS backend service with Prisma ORM, PostgreSQL, Redis, Socket.io, BullMQ, and LLM integrations (Groq / Gemini / OpenAI).
- **`frontend/`**: Next.js App Router frontend with Tailwind CSS, Radix UI / Shadcn, and interactive inbox & dashboard.

## Getting Started

### Backend Setup
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and configure your environment variables.
4. `npx prisma migrate dev`
5. `npm run start:dev`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`
