# Production Build Stage
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies needed for Prisma and general build
RUN apt-get update && apt-get install -y openssl

# Copy package files
COPY package*.json ./

# Install all dependencies (production + development)
RUN npm install

# Copy source code and Prisma schema
COPY . .

# Generate Prisma Client (with Driver Adapter compatibility)
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# ---

# Production Runtime Stage
FROM node:20-slim

WORKDIR /app

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy build artifacts and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Set environment to production
ENV NODE_ENV=production

# Expose the API port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]
