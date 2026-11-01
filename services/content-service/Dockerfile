
# Giai đoạn build
FROM node:22-alpine AS build

WORKDIR /app

RUN npm install -g pnpm@10.25.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

COPY packages ./packages
COPY services/content-service ./services/content-service

RUN pnpm install --frozen-lockfile

# Build package dùng chung cho JWT
RUN pnpm --filter @badminton/auth-contracts build

# Build Content Service
RUN pnpm --filter @badminton/content-service build

# Đóng gói dependencies production
RUN pnpm --filter @badminton/content-service deploy --legacy --prod /out


# Giai đoạn runtime
FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=build --chown=node:node /out /app

USER node

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main.js"]
