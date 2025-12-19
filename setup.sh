#!/bin/bash

# ExtraHand Live Tracking - Quick Setup Script

echo "🚀 Setting up ExtraHand Live Tracking Platform..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local with your actual credentials"
    echo ""
else
    echo "✓ .env.local already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your credentials:"
echo "   - Google Maps API Key"
echo "   - Redis URL and Token (get from https://upstash.com)"
echo "   - MongoDB URI (get from https://mongodb.com/cloud/atlas)"
echo ""
echo "2. Run the development server:"
echo "   npm run dev"
echo ""
echo "3. Visit http://localhost:3000"
echo ""
