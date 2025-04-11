FROM node:22.12.0-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN mkdir -p data

# Etap deweloperski
FROM base AS development
RUN apk add --no-cache git bash
RUN npm install
ARG NODE_PORT=3080
EXPOSE $NODE_PORT
CMD ["npm", "run", "dev"]

# Etap produkcyjny
FROM base AS production
ARG NODE_PORT=3080
RUN npm ci --only=production
COPY . .
EXPOSE $NODE_PORT
CMD ["npm", "start"]

# Domyślny obraz - możemy wybrać target podczas budowania:
# docker build --target development -t mocksrv:dev .
# docker build --target production -t mocksrv:prod . 