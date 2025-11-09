#!/bin/bash

# CRITICAL FIX: Install Playwright browsers for the BrowserTool
echo "Installing Playwright browsers..."
pnpm exec playwright install chromium

# Function to install dependencies and start service in background
start_service() {
    local dir=$1
    local script=$2
    echo "Installing dependencies for $dir..."
    cd "$dir"
    pnpm install --production
    
    echo "Starting $dir in background..."
    nohup node "$script" > "$dir.log" 2>&1 &
    cd ..
}

# تشغيل Worker في الخلفية
start_service "worker" "worker-enhanced.mjs"

# تشغيل JOEngine AGI في المقدمة (Foreground) لتمكين Render من اكتشاف المنفذ
echo "Starting JOEngine AGI (Main Process)..."
cd joengine-agi
pnpm install --production
node index.mjs
