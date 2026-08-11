FROM node:26-bookworm-slim@sha256:cd565714d4da3e84bfd341e31448f81d47c6362198f152345297c9c1154e6341

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
