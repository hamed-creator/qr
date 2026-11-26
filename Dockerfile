FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY client/package.json ./client/
RUN npm ci

COPY client ./client
RUN npm run build --workspace qr-studio-client

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY client/package.json ./client/
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/server/public ./server/public

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
