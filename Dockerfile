# ── Ecomai Backend ──
FROM oven/bun:1.1-alpine

WORKDIR /app

# Install deps first (layer cache)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source
COPY index.js ./
COPY src/ ./src/
COPY db/ ./db/
COPY tests/ ./tests/

# Create uploads dir and ensure non-root user owns the app
RUN mkdir -p /app/uploads/products && \
    addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["bun", "run", "index.js"]
