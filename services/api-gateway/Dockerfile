FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY services/api-gateway ./services/api-gateway
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @badminton/api-gateway build
RUN pnpm --filter @badminton/api-gateway deploy --legacy --prod /runtime
FROM node:22-alpine
RUN apk add --no-cache dumb-init && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /runtime ./
USER node
EXPOSE 8081
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
