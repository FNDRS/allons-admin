FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml next.config.ts tsconfig.json postcss.config.js tailwind.config.ts ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
# Next.js standalone necesita el build con env públicas (se incrustan en el JS del cliente)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_WAITLIST_BASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_WAITLIST_BASE_URL=$NEXT_PUBLIC_WAITLIST_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3001
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
# No necesita pnpm en runtime, pero lo dejamos por si healthcheck lo usa
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
# Usuario no-root (App Runner corre como root por defecto, pero es mejor práctica)
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# Standalone genera server.js + .next/static + public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# next.config usa output:standalone, el server escucha en 3001
USER nextjs
EXPOSE 3001
# Healthcheck que App Runner usa (TCP en 3001) — además validamos HTTP
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3001/login || exit 1
CMD ["node", "server.js"]
