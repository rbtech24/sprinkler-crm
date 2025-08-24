#!/bin/sh
set -e

# Start backend on port 3001
cd /app/backend
PORT=3001 node src/server.js &

# Start frontend on port 3002  
cd /app/frontend
PORT=3002 NEXT_PUBLIC_API_URL=http://localhost:3001/api node server.js &

# Start nginx on port 3000
nginx -g 'daemon off;' &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?