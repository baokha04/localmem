# --- Stage 1: Builder ---
FROM node:20 AS builder
WORKDIR /app

# Copy dependency specifications
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies for compiler)
# Using Node 20 ensures g++, make, and python3 are present for tree-sitter C++ building
RUN npm ci

# Copy codebase
COPY src ./src
COPY scripts ./scripts

# Build TypeScript to JavaScript
RUN npm run build

# Prune devDependencies to keep container slim
RUN npm prune --production


# --- Stage 2: Production ---
FROM node:20
WORKDIR /app

# Copy dependency details and built files from Builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Keep schema file accessible for reference or migrations
COPY src/schema.sql ./dist/src/schema.sql

# Expose default environment configurations
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://postgres:postgres@db:5432/antigravity

# Set entry point
CMD ["npm", "start"]
