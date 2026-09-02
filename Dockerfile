FROM node:26-bookworm-slim@sha256:367679cf9792759492a486e4aa4b421764d71a9546a6dae8aab81a99eb797b3e

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
