FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    ffmpeg \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create data directories
RUN mkdir -p data/events data/git_repos

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]