# WhatsHub Official Documentation

Welcome to the official technical documentation for **WhatsHub**. This directory contains the complete technical architecture, API references, database schemas, business logic flows, and onboarding guides for the project.

This documentation is designed to serve the CTO, Senior Developers, QA, DevOps, Security Auditors, and AI Coding Agents.

## Table of Contents

1. [Section 1: Executive Overview](./1_Executive_Overview.md)
   - Project Purpose & Business Problem Solved
   - Main Features & High-Level Architecture
   - Target Users & Technology Stack
2. [Section 2: Architecture & Project Structure](./2_Architecture_and_Structure.md)
   - System Architecture Diagram
   - Frontend and Backend Directory Structures
   - Complete Module Breakdown
3. [Section 3: API Reference](./3_API_Reference.md)
   - Authentication Endpoints
   - WhatsApp Integrations
   - Contacts & Campaigns
   - Zero-Downtime Health Probes
4. [Section 4: Database Schema](./4_Database_Schema.md)
   - Entity Relationship Diagram
   - Core Tables (Shop, User, Contact, Message, Campaign)
5. [Section 5: Business Workflows](./5_Business_Workflows.md)
   - Incoming Message Webhook Flow
   - Campaign Execution (Cursor Pagination Engine)
   - Sequence Processing
   - Embedded Signup Flow
6. [Section 6: Frontend & Integrations](./6_Frontend_Backend_Details.md)
   - Next.js Routing Map & Zustand State
   - External Integrations (Meta, Groq, PostgreSQL, Redis)
   - BullMQ Queues and Workers
7. [Section 7: DevOps & Security](./7_DevOps_and_Security.md)
   - Configuration & Environment Variables (`.env`)
   - Docker Deployment Guides (Local & Production)
   - Security Boundary Highlights (HttpOnly Cookies, Isolation)
   - Troubleshooting Guide
8. [Section 8: Developer Onboarding](./8_Developer_Onboarding.md)
   - Where to Start & Coding Standards
   - Technical Debt & Future Limitations
   - Feature Catalog Overview

---

*Documentation auto-generated and maintained by the Principal Architecture Team.*
