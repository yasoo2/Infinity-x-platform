#!/bin/bash

# Build script for Infinity-X Platform
# This script builds both the frontend (dashboard-x) and backend

echo "🚀 Starting build process for Infinity-X Platform..."

# Set environment variables to skip Puppeteer download
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_SKIP_DOWNLOAD=true

# Step 1: Install Backend Dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --loglevel verbose
cd ..

# Step 2: Build Frontend (dashboard-x)
echo "📦 Building frontend (dashboard-x)..."
cd dashboard-x
pnpm install --frozen-lockfile
pnpm build
cd ..

echo "✅ Build process completed successfully!"
