#!/bin/bash

# Render Startup Script for JOEngine Backend
# This script navigates to the correct directory and starts the backend service

echo "🚀 Starting JOEngine Backend..."

# Navigate to the joengine-agi directory
cd ../joengine-agi || {
    echo "❌ Error: joengine-agi directory not found!"
    exit 1
}

echo "✅ Successfully navigated to joengine-agi directory"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the backend service
echo "🔥 Starting backend service..."
npm start
