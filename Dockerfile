FROM node:26-bookworm-slim@sha256:81502e860176e63695d769d3d1a2d3a403abc1c27c6a02169b765f3e43b60ede

WORKDIR /workspace

ENV PORT=8080

COPY .node-version ./
COPY scripts ./scripts/
COPY package.json package-lock.json ./
COPY app/package.json app/package-lock.json ./app/
COPY dtoapi/package.json dtoapi/package-lock.json ./dtoapi/
COPY dtoapi/modern/package.json dtoapi/modern/package-lock.json ./dtoapi/modern/

RUN npm run install:all

COPY . .

RUN npm run build

ENV NODE_ENV=production

RUN chown -R node:node /workspace

USER node

EXPOSE 8080

CMD ["npm", "run", "start:app"]
