FROM node:26-bookworm-slim

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

EXPOSE 8080

CMD ["npm", "run", "start:app"]
