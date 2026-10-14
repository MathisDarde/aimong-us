FROM node:24-alpine AS build
RUN npm install -g pnpm@12.11.2
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @aimong-us/api --filter @aimong-us/web
COPY apps apps
RUN pnpm --filter @aimong-us/web build \
  && pnpm --filter @aimong-us/api build \
  && pnpm --filter @aimong-us/api deploy --prod /out

FROM node:24-alpine
ENV NODE_ENV=production
ENV STATIC_DIR=public
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/web/dist ./public
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
