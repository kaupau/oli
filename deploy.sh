#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> Building frontend..."
cd frontend
npm run build
cd ..

echo "==> Building backend..."
cd backend
go build -o strudelvibe ./cmd/server
cd ..

echo "==> Starting server..."
echo "Frontend will be served from: frontend/dist"
echo "Backend running on: http://localhost:8080"
echo ""

# Export env vars
export STATIC_DIR="$(pwd)/frontend/dist"
export PORT=8080

# Run the server
cd backend
./strudelvibe &
SERVER_PID=$!
cd ..

echo "==> Server started (PID: $SERVER_PID)"
echo ""

# Check if cloudflared is installed
if command -v cloudflared &> /dev/null; then
    echo "==> Starting cloudflare tunnel..."
    echo "Your public URL will appear below:"
    echo ""
    cloudflared tunnel --url http://localhost:8080
else
    echo "cloudflared not installed. Install with:"
    echo "  brew install cloudflared"
    echo ""
    echo "Or run manually:"
    echo "  cloudflared tunnel --url http://localhost:8080"
    echo ""
    echo "Press Ctrl+C to stop the server"
    wait $SERVER_PID
fi
