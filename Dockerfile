# Stage 1: Builder
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL and build dependencies (needed for Prisma)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-engines

# Copy source code and generate Prisma client
COPY . .
RUN npx prisma generate

# Build the NestJS application
RUN yarn build

# Stage 2: Production Runner
FROM node:20-slim

WORKDIR /app

# Install dumb-init and OpenSSL for the runtime environment
RUN apt-get update && apt-get install -y \
    dumb-init \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy necessary artifacts from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/yarn.lock ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]