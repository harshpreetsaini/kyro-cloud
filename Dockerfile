# syntax=docker/dockerfile:1
# Build cache bust: 1787020000
#
# Render runs this image as the BACKEND / control plane only.
# The Next.js frontend is deployed separately on Vercel and is intentionally
# excluded here. This mirrors Dockerfile.render.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Only the Node-compatible backend + lib modules are needed.
COPY lib ./lib
COPY backend ./backend

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "backend/server.mjs"]
