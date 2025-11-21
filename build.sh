#!/bin/bash

# Build script for Infinity-X Platform
# This script builds both the frontend (dashboard-x) and installs all dependencies

echo "🚀 Starting build process for Infinity-X Platform..."

# Step 1: Install root dependencies (for shared packages)
echo "📦 Installing root dependencies..."
npm install

# Step 2: Build Frontend (dashboard-x)
echo "📦 Building frontend (dashboard-x)..."
cd dashboard-x
npm install
npm run build
cd ..

# Step 3: Final check for backend dependencies (already installed in step 1)
echo "✅ Build process completed successfully!"
