#!/bin/bash

# FairTalk Quick Start Script
# This script sets up and starts the entire FairTalk application

echo "🚀 Starting FairTalk Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14+ first."
    exit 1
fi

# Check if Redis is running
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis CLI not found. Make sure Redis server is running."
    echo "   Start Redis with: redis-server"
else
    redis-cli ping > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is not responding. Please start Redis server."
        exit 1
    fi
fi

# Setup backend
echo -e "\n📦 Setting up backend..."
cd backend
cp .env.example .env
npm install

# Check if dependencies installed successfully
if [ ! -d "node_modules" ]; then
    echo "❌ Backend dependencies failed to install"
    exit 1
fi

echo "✅ Backend dependencies installed"

# Setup frontend
echo -e "\n📦 Setting up frontend..."
cd ../frontend
npm install

if [ ! -d "node_modules" ]; then
    echo "❌ Frontend dependencies failed to install"
    exit 1
fi

echo "✅ Frontend dependencies installed"

echo -e "\n✅ Setup complete!"
echo -e "\n📝 Next steps:"
echo "   1. Update .env file in backend/ with your configuration"
echo "   2. Start the backend: cd backend && npm run dev"
echo "   3. Start the frontend: cd frontend && npm run dev"
echo "   4. Open http://localhost:5173 in your browser"
echo -e "\n📖 See WEBSOCKET_SETUP.md for detailed documentation"
