# ── Ecomai Frontend (production build) ──
# Stage 1: Build
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Install deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source
COPY . .

# Build-time vars (VITE_* must be set at build time)
# If VITE_API_URL is provided at build time, embed it; otherwise use relative path
ARG VITE_API_URL=""
ENV VITE_API_URL ${VITE_API_URL:-http://localhost:3000}

RUN bun run build

# Stage 2: Serve with static file server
FROM oven/bun:1.1-alpine

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000

# serve handles SPA routing and static file serving (-l = port, -s = SPA mode)
CMD ["bunx", "--bun", "serve", "-s", "dist", "-l", "3000"]
