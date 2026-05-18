FROM node:22-bookworm-slim

WORKDIR /workspace

ENV NODE_ENV=development
ENV PORT=8080

COPY package.json package-lock.json ./
COPY app/package.json app/package-lock.json ./app/
COPY dtoapi/package.json dtoapi/package-lock.json ./dtoapi/

RUN npm run install:all

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "start:app"]
