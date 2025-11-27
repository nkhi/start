#!/bin/bash

# Start the server in the background
cd server
node index.js &
SERVER_PID=$!

# Go back to root and start the client
cd ..
cd client

# Open browser after a short delay (in background so it doesn't block)
(sleep 2 && open http://localhost:5174/) &

pnpm run dev

# When the client stops (Ctrl+C), kill the server too
kill $SERVER_PID
