FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs ./
COPY packages ./packages
COPY apps/admin ./apps/admin
RUN pnpm install --frozen-lockfile
ARG VITE_API_GATEWAY_URL=
ARG VITE_CLIENT_ID=
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL VITE_CLIENT_ID=$VITE_CLIENT_ID
RUN pnpm --filter @badminton/admin build
FROM nginx:1.28-alpine
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/templates/default.conf.template
ENV API_GATEWAY_URL=http://host.docker.internal:8080
ENV NGINX_ENVSUBST_FILTER=API_GATEWAY_URL
EXPOSE 80
