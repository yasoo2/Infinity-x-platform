#!/bin/bash

# Build script for Infinity-X Platform
# This script builds both the frontend (dashboard-x) and backend

echo "🚀 Starting build process for Infinity-X Platform..."

# Step 1: Build Frontend (dashboard-x)
echo "📦 Building frontend (dashboard-x)..."
cd dashboard-x
pnpm install
pnpm build
cd ..

# Step 2: Install Backend Dependencies
echo "📦 Installing backend dependencies..."
cd backend
pnpm install
cd ..

echo "✅ Build process completed successfully!"
