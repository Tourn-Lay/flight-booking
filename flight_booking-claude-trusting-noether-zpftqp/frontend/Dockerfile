FROM node:22-alpine

WORKDIR /app

# Install dependencies at build time (cached while package*.json is unchanged)
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 3000
# Development server with hot reload (source is bind-mounted by docker-compose)
CMD ["npm", "run", "dev"]
