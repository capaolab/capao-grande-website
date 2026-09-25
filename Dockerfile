# syntax=docker/dockerfile:1

FROM node:24.11.0-slim AS base
WORKDIR /app
# Pinned to the exact version in .node-version/package.json#engines, kept
# in sync across local dev and every image stage. Also sidesteps an npm
# bug (present in both the 22-slim image's bundled 10.9.8 and the latest
# 11.19.x) that makes `npm ci` falsely report nested optional packages
# (the sharp/Next wasm32 fallback chain, e.g. @emnapi/runtime) as missing
# from an otherwise valid lockfile; the npm bundled with this exact node
# version (11.6.1) doesn't hit it.
#
# The base image ships a "node" user at uid/gid 1000, matching the default
# first user on most Linux hosts. Using it (instead of root) means files
# written into the bind-mounted ./webapp (e.g. .next/) in the dev stage stay
# owned by the host user rather than root.

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Development ----
# Runs `next dev` against the source mounted by docker-compose.
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node . .
# .next is an anonymous volume (see docker-compose.override.yml); Docker
# seeds it from whatever is at this path in the image, so it must already
# be owned by "node" or `next dev` can't create files under it.
RUN mkdir -p .next && chown node:node .next
USER node
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- Build ----
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URI/PAYLOAD_SECRET are only read to build the Payload config
# object at build time. No DB connection is made: every CMS read calls
# `connection()` (lib/payload.ts), so pages render per request instead of
# being prerendered against the database. Placeholders are set only for this
# RUN (no ARG/ENV), so real secrets can't be baked in via build args — this
# image is published to the registry (.github/workflows/release.yml). Real
# values come at runtime.
RUN DATABASE_URI=postgres://placeholder:placeholder@localhost:5432/placeholder \
    PAYLOAD_SECRET=placeholder-build-secret \
    npm run build

# ---- Production ----
# Runs the Next.js standalone server produced by `output: "standalone"`.
# Pending migrations (src/migrations) are applied on startup by Payload's
# `prodMigrations` (src/payload.config.ts).
FROM base AS runner
ENV NODE_ENV=production
# Uploads dir (Payload `media` collection), owned by "node" so a named
# volume mounted here starts writable.
RUN mkdir -p /app/media && chown node:node /app/media

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
