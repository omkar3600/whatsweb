# Section 1: Executive Overview

## 1.1 Project Purpose
WhatsHub is an enterprise-grade WhatsApp Cloud API CRM and marketing automation platform. It allows businesses ("Shops") to connect their WhatsApp Business accounts to a centralized dashboard to manage conversations, run bulk messaging campaigns, create automated conversational flows, and orchestrate complex messaging sequences. 

## 1.2 Business Problem Solved
Managing customer communication at scale on WhatsApp is impossible through the standard mobile app. Businesses need a way to:
- Handle thousands of inbound messages via a multi-agent inbox.
- Send targeted marketing campaigns (broadcasts) to segmented customer lists.
- Automate repetitive tasks using chatbots and rule-based flows.
- Ensure 100% reliability, compliance, and delivery tracking.
WhatsHub provides a scalable, centralized platform to solve these communication bottlenecks.

## 1.3 Target Users
- **Shop Owners / Admins:** Configure WhatsApp integrations, manage templates, view analytics, and manage billing.
- **Support Agents:** Use the unified inbox to reply to customer inquiries in real-time.
- **Marketing Managers:** Upload contacts, build segments, and launch targeted WhatsApp campaigns.

## 1.4 Main Features
1. **Multi-Tenant Architecture:** Supports multiple "Shops", securely isolating data between businesses.
2. **Unified Inbox:** Real-time WebSockets-powered chat interface.
3. **Campaign Manager:** Bulk messaging engine with BullMQ-backed cursor pagination for handling millions of contacts.
4. **Flow Builder:** Visual node-based workflow editor for creating automated chat journeys.
5. **Drip Sequences:** Time-delayed automated messaging sequences based on user tags.
6. **Embedded Signup:** Frictionless Meta/Facebook OAuth integration for instant WhatsApp Business API connection.

## 1.5 High-Level Architecture
WhatsHub uses a modern, decoupled architecture:
- **Frontend:** Next.js (React), TailwindCSS, Zustand (State Management).
- **Backend:** NestJS (Node.js framework), strictly typed with TypeScript.
- **Database:** PostgreSQL managed via Prisma ORM.
- **Caching & Queues:** Redis paired with BullMQ for reliable asynchronous job processing.
- **Real-Time:** Socket.io for bi-directional event streaming.

## 1.6 Technology Stack
- **Languages:** TypeScript, JavaScript, HTML, CSS.
- **Frontend:** Next.js 14 (App Router), React, Tailwind, Lucide Icons.
- **Backend:** NestJS 10, RxJS, Express.
- **Database:** PostgreSQL (Supabase/Neon), Prisma ORM.
- **Queues:** Redis, BullMQ.
- **External Integrations:** Meta Cloud API (WhatsApp), Groq API (LLM Chatbot).

## 1.7 Current Maturity Level
**Production Ready.** The system features advanced performance optimizations (cursor pagination, DB indexing), robust security (HttpOnly cookies, secure PINs, global exception hiding), and strict idempotency for handling real-world, high-volume webhook traffic from Meta without data corruption.
