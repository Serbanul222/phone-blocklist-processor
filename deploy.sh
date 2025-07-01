#!/bin/bash

# Phone Blocklist Processor - Production Deployment Script
# Server: 192.168.101.50:8090

echo "🚀 Starting deployment of Phone Blocklist Processor..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="phone-blocklist-processor"
PORT=8090
SERVER_IP="192.168.101.50"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo -e "  • App Name: ${APP_NAME}"
echo -e "  • Server: ${SERVER_IP}:${PORT}"
echo -e "  • Network Access: http://${SERVER_IP}:${PORT}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down 2>/dev/null || true

# Remove old images (optional)
echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
docker image prune -f

# Build and start the application
echo -e "${BLUE}🔨 Building and starting the application...${NC}"
docker-compose up --build -d

# Wait for the application to start
echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
sleep 10

# Check if the container is running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Container is running successfully!${NC}"
else
    echo -e "${RED}❌ Container failed to start. Checking logs...${NC}"
    docker-compose logs
    exit 1
fi

# Health check
echo -e "${BLUE}🔍 Performing health check...${NC}"
sleep 5

# Test the health endpoint
if curl -f -s "http://localhost:3000/api/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Health check endpoint not responding yet...${NC}"
fi

# Show final status
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📱 Access your application:${NC}"
echo -e "  • Local: http://localhost:${PORT}"
echo -e "  • Network: http://${SERVER_IP}:${PORT}"
echo ""
echo -e "${BLUE}🔧 Management commands:${NC}"
echo -e "  • View logs: docker-compose logs -f"
echo -e "  • Stop app: docker-compose down"
echo -e "  • Restart: docker-compose restart"
echo -e "  • Rebuild: docker-compose up --build -d"
echo ""
echo -e "${BLUE}📊 Container status:${NC}"
docker-compose ps

# Show resource usage
echo ""
echo -e "${BLUE}💾 Resource usage:${NC}"
docker stats --no-stream ${APP_NAME} 2>/dev/null || echo "Container stats not available"

echo ""
echo -e "${GREEN}✨ Phone Blocklist Processor is now live at http://${SERVER_IP}:${PORT}${NC}"