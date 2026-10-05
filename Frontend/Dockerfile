FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs ./
COPY packages ./packages
COPY Frontend ./Frontend
RUN pnpm install --frozen-lockfile
ARG VITE_ENABLE_DEMO_AUTH=false
ENV VITE_ENABLE_DEMO_AUTH=$VITE_ENABLE_DEMO_AUTH
RUN pnpm --filter @badminton/frontend build
FROM nginx:1.28-alpine
COPY --from=build /app/Frontend/dist /usr/share/nginx/html
COPY Frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
