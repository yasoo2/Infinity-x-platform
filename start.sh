#!/bin/bash

# Start JOEngine AGI in the background
echo "Starting JOEngine AGI..."
cd joengine-agi
node index.mjs &
cd ..

# Start Worker in the background
echo "Starting Worker..."
cd worker
node worker-enhanced.mjs &
cd ..

# Start Backend (main process)
echo "Starting Backend..."
cd backend
node server.mjs
