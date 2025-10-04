#!/bin/bash

# GitDone Production Deployment Script
# Run this script on your VPS after initial setup

set -e  # Exit on any error

echo "🚀 GitDone Production Deployment"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as gitdone user
if [ "$USER" != "gitdone" ]; then
    echo -e "${RED}❌ Please run this script as the 'gitdone' user${NC}"
    echo "Run: su - gitdone"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Please run this script from the GitDone root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Installing/Updating dependencies...${NC}"

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install --production --silent
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install --production --silent

# Build frontend
echo "Building frontend..."
npm run build
cd ..

echo -e "${GREEN}✅ Dependencies installed and frontend built${NC}"

# Create data directories if they don't exist
echo -e "${YELLOW}📁 Creating data directories...${NC}"
mkdir -p data/events data/uploads data/git_repos logs

echo -e "${GREEN}✅ Data directories created${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file with your configuration:"
    echo "cp .env.example .env"
    echo "nano .env"
    exit 1
fi

# Check if ecosystem.config.js exists
if [ ! -f "ecosystem.config.js" ]; then
    echo -e "${YELLOW}📝 Creating PM2 ecosystem configuration...${NC}"
    
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'gitdone-backend',
      script: './backend/server.js',
      cwd: '$(pwd)',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '$(pwd)/logs/backend-error.log',
      out_file: '$(pwd)/logs/backend-out.log',
      log_file: '$(pwd)/logs/backend-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'gitdone-frontend',
      script: 'npm',
      args: 'start',
      cwd: '$(pwd)/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '$(pwd)/logs/frontend-error.log',
      out_file: '$(pwd)/logs/frontend-out.log',
      log_file: '$(pwd)/logs/frontend-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

    echo -e "${GREEN}✅ PM2 ecosystem configuration created${NC}"
fi

# Stop existing PM2 processes
echo -e "${YELLOW}🛑 Stopping existing PM2 processes...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start applications with PM2
echo -e "${YELLOW}🚀 Starting applications with PM2...${NC}"
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✅ Applications started with PM2${NC}"

# Check if applications are running
echo -e "${YELLOW}🔍 Checking application status...${NC}"
sleep 3

# Check backend
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on port 3001${NC}"
else
    echo -e "${RED}❌ Backend is not responding on port 3001${NC}"
    echo "Check logs: pm2 logs gitdone-backend"
fi

# Check frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on port 3000${NC}"
else
    echo -e "${RED}❌ Frontend is not responding on port 3000${NC}"
    echo "Check logs: pm2 logs gitdone-frontend"
fi

# Show PM2 status
echo -e "${YELLOW}📊 PM2 Status:${NC}"
pm2 status

echo ""
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3001"
echo ""
echo "📋 Useful commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs            - View application logs"
echo "  pm2 restart all     - Restart all applications"
echo "  pm2 monit           - Monitor resources"
echo ""
echo "🔍 If you see any issues:"
echo "  pm2 logs gitdone-backend"
echo "  pm2 logs gitdone-frontend"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to configure Nginx and SSL!${NC}"
echo "See DEPLOYMENT.md for complete setup instructions."