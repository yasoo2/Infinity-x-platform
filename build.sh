#!/bin/bash
set -e

echo "Starting build process..."

# Install root dependencies
npm install

# Install and build dashboard-x (frontend)
echo "Building dashboard-x..."
cd dashboard-x
npm install
npm run build
cd ..

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install worker dependencies
echo "Installing worker dependencies..."
cd worker
npm install
cd ..

echo "Build complete!"
