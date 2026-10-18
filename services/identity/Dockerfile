FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app/services/identity
COPY services/identity/package.json services/identity/package-lock.json ./
RUN npm ci
COPY tsconfig.base.json /app/tsconfig.base.json
COPY services/identity/tsconfig*.json ./
COPY services/identity/prisma ./prisma
RUN npm run prisma:generate
COPY services/identity/src ./src
RUN npm run build

FROM build AS migrate
CMD ["npm", "run", "prisma:migrate:deploy"]

FROM build AS production-deps
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl dumb-init
WORKDIR /app/services/identity
ENV NODE_ENV=production
COPY --from=production-deps /app/services/identity/node_modules ./node_modules
COPY --from=build /app/services/identity/dist ./dist
COPY --from=build /app/services/identity/generated ./generated
USER node
EXPOSE 8084
CMD ["dumb-init", "node", "dist/main.js"]
