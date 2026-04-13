FROM node:18-alpine

# C library compatibility for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Build Prisma Client inside the container
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Compile TypeScript
RUN npm run build

# Copy public static files so Express can serve them from dist/../public
RUN cp -r ./public ./dist/public

# Expose the standard Cloud Run port
EXPOSE 8080

# Overwrite environment variable PORT for Cloud Run
ENV PORT=8080

# Start server
CMD ["node", "dist/src/server.js"]
