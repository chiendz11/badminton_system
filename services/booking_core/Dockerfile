FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl && npm install -g pnpm@10.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs ./
COPY packages ./packages
COPY services/booking_core ./services/booking_core
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @badminton/booking-core prisma:generate
RUN pnpm --filter @badminton/booking-core build
RUN pnpm --filter @badminton/booking-core deploy --legacy --prod /out


FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache openssl dumb-init && rm -rf /usr/local/lib/node_modules /opt/yarn-* /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=build /out /app
USER node
EXPOSE 3000
CMD ["dumb-init", "node", "dist/main.js"]
