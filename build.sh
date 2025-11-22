#!/bin/bash
set -e

echo "Starting build process..."

# Install root dependencies
# This triggers the 'postinstall' script in package.json which installs 
# backend, dashboard-x, and worker dependencies using pnpm
npm install

# Build dashboard-x (frontend)
echo "Building dashboard-x..."
cd dashboard-x
# We can use npm run build here, it will use the vite binary installed by pnpm
npm run build
cd ..

echo "Build complete!"
