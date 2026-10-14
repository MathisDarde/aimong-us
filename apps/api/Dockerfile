FROM node:24-alpine AS build
RUN npm install -g pnpm@12.11.2
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @aimong-us/api
COPY apps/api apps/api
RUN pnpm --filter @aimong-us/api build \
  && pnpm --filter @aimong-us/api deploy --prod /out

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
