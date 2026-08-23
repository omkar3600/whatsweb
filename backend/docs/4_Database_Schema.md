# Section 4: Database Documentation

The database is PostgreSQL, managed by Prisma ORM (`schema.prisma`).

## 4.1 Entity Relationship Diagram
```text
[Shop] 1---M [User]
[Shop] 1---M [Contact]
[Shop] 1---M [Campaign]
[Shop] 1---M [Template]
[Shop] 1---M [Conversation]
[Contact] 1---M [Conversation]
[Conversation] 1---M [Message]
[Campaign] 1---M [CampaignContact]
[Contact] 1---M [CampaignContact]
```

## 4.2 Core Tables

### `Shop`
- **Purpose:** The multi-tenant isolation root. Every business gets one Shop.
- **Columns:** `id`, `name`, `whatsappPhoneId`, `whatsappAccountId`, `status`, `config`.
- **Usage:** All operational data belongs to a Shop. Middleware/Interceptors enforce Shop-level isolation.

### `User`
- **Purpose:** Authentication credentials for dashboard access.
- **Columns:** `id`, `shopId`, `username`, `password`, `role` (ADMIN/USER).

### `Contact`
- **Purpose:** Represents an end-customer interacting via WhatsApp.
- **Columns:** `id`, `shopId`, `phone` (unique per shop), `name`, `tags` (Array).
- **Constraints:** Unique `[shopId, phone]`.

### `Conversation`
- **Purpose:** Groups messages between a Shop and a Contact.
- **Columns:** `id`, `shopId`, `contactId`, `status`, `lastMessageAt`.
- **Constraints:** Unique `[shopId, contactId]`.

### `Message`
- **Purpose:** Individual chat messages (Inbound/Outbound).
- **Columns:** `id`, `conversationId`, `direction`, `type`, `content`, `wamid` (Meta ID), `status`.
- **Indexes:** `@@index([conversationId])` for fast inbox loading.

### `Campaign`
- **Purpose:** Definition of a bulk broadcast.
- **Columns:** `id`, `shopId`, `name`, `status`, `scheduledAt`, `templateId`, `stats`.

### `CampaignContact`
- **Purpose:** Tracks delivery status of a campaign for a specific contact.
- **Columns:** `campaignId`, `contactId`, `phone`, `status` (sent/delivered/read/failed).
- **Indexes:** `@@index([campaignId])`. Unique constraint on `[campaignId, phone]`.

## 4.3 Relationship Explanation
- **One-to-Many (Shop -> User):** A business can have multiple agents logging in.
- **Many-to-Many via Join Table (Campaign -> CampaignContact <- Contact):** Tracks exactly who received which campaign and their individual delivery status.
