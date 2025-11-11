#!/bin/bash
set -e

# Build script for Infinity-X Platform
# This script builds both the frontend (dashboard-x) and backend

echo "🚀 Starting build process for Infinity-X Platform..."

# Step 1: Install Backend Dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Step 2: Build Frontend (dashboard-x)
echo "📦 Installing frontend dependencies..."
cd dashboard-x
pnpm install --no-frozen-lockfile
echo "🏗️ Building frontend..."
pnpm build
cd ..

echo "✅ Build process completed successfully!"
