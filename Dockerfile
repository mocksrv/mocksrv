FROM node:22.12.0-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN mkdir -p data

# Etap deweloperski
FROM base AS development
RUN apk add --no-cache git bash
RUN npm install
EXPOSE 1080
CMD ["npm", "run", "dev"]

# Etap produkcyjny
FROM base AS production
RUN npm ci --only=production
COPY . .
EXPOSE 1080
CMD ["node", "app/server.js"]

# Domyślny obraz - możemy wybrać target podczas budowania:
# docker build --target development -t mocksrv:dev .
# docker build --target production -t mocksrv:prod . 