#!/bin/bash

# Function to install dependencies and start service in background
start_service() {
    local dir=$1
    local script=$2
    echo "Installing dependencies for $dir..."
    cd "$dir"
    pnpm install --production
    
    echo "Starting $dir..."
    node "$script" &
    cd ..
}

# Install dependencies for all services
start_service "joengine-agi" "index.mjs"
start_service "worker" "worker-enhanced.mjs"

# Start Backend (main process)
echo "Starting Backend..."
cd backend
pnpm install --production
node server.mjs
