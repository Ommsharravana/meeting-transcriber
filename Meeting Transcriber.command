#!/bin/bash

# Meeting Transcriber Launcher
# Double-click this file to start the app

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           Meeting Transcriber Launcher                    ║"
echo "║           AI-Powered Speech to Text                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed or not in PATH${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install dependencies${NC}"
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

# Check if server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Server already running on port 3000${NC}"
    echo -e "${GREEN}Opening app...${NC}"
else
    # Start the server in background
    echo -e "${YELLOW}Starting server...${NC}"
    npm run dev > /dev/null 2>&1 &
    SERVER_PID=$!

    # Wait for server to be ready (max 30 seconds)
    echo -n "Waiting for server to start"
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo -e "\n${GREEN}Server started successfully!${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done

    # Check if server started
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "\n${RED}Server failed to start within 30 seconds${NC}"
        echo "Check the logs above for errors."
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

# Open in Chrome as a standalone app (app mode)
APP_URL="http://localhost:3000"

echo -e "${GREEN}Opening Meeting Transcriber...${NC}"

# Try Chrome first (most common for PWA)
if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="$APP_URL"
elif [ -d "/Applications/Chromium.app" ]; then
    open -na "Chromium" --args --app="$APP_URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --app="$APP_URL"
elif [ -d "/Applications/Brave Browser.app" ]; then
    open -na "Brave Browser" --args --app="$APP_URL"
else
    # Fall back to default browser
    echo -e "${YELLOW}Note: Install Chrome for best PWA experience${NC}"
    open "$APP_URL"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Meeting Transcriber is running!${NC}"
echo ""
echo "• App URL: $APP_URL"
echo "• To install as PWA: Click the install icon (⊕) in Chrome's address bar"
echo "• To stop: Close this terminal window or press Ctrl+C"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Keep terminal open to show server is running
# User can close terminal or Ctrl+C to stop
if [ -n "$SERVER_PID" ]; then
    wait $SERVER_PID
fi
