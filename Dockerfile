# ========= Build stage =========
FROM oven/bun:1 AS build
WORKDIR /app

# Copy dependency descriptors first for layer caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Provide DATABASE_URL for Prisma during build
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Copy full project source
COPY . .

# ========= Runtime stage =========
FROM oven/bun:1 AS runtime
WORKDIR /app

# Copy package files and install production dependencies
COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/node_modules ./node_modules

# Copy source code (including lib, routes, middleware, services, db)
COPY --from=build /app/src ./src
COPY --from=build /app/drizzle.config.* ./
COPY --from=build /app/tsconfig.json ./

# ========= Environment =========
ENV NODE_ENV=production
ENV PORT=6868
ENV LOG_LEVEL=info

EXPOSE 6868

# ========= Startup =========
CMD ["bash", "-c", "bunx drizzle-kit push && bun run src/index.ts"]
