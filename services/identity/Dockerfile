FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl && npm install -g pnpm@10.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs ./
COPY packages ./packages
COPY services/identity ./services/identity
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @badminton/identity prisma:generate
RUN pnpm --filter @badminton/identity build
RUN pnpm --filter @badminton/identity deploy --legacy --prod /out
RUN cp -r services/identity/dist services/identity/generated /out/

FROM build AS migrate
WORKDIR /app/services/identity
CMD ["pnpm", "prisma:migrate:deploy"]

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache openssl dumb-init && rm -rf /usr/local/lib/node_modules /opt/yarn-* /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=build /out /app
USER node
EXPOSE 8084
CMD ["dumb-init", "node", "dist/main.js"]
