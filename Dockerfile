# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build # This runs 'vite build' and 'esbuild'

# Stage 2: Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production dependencies as ROOT first
RUN npm ci

# Create a non-root user and change ownership
RUN addgroup -g 1001 -S nodejs && \
    adduser -S addypin -u 1001 && \
    chown -R addypin:nodejs /app

# Switch to non-root user
USER addypin

# Expose port and define runtime command
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
