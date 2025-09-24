FROM node:20-alpine
WORKDIR /app
# Install native build tools for better-sqlite3 (and other native deps)
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm i --only=production
COPY src ./src
EXPOSE 4000
CMD ["node", "src/index.js"]

