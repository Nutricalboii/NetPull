#!/bin/bash

# NetPull Launcher for Linux

# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start the daemon in the background
echo "Starting NetPull Daemon..."
"$DIR/dist/netpull-daemon" &
DAEMON_PID=$!

# Wait for daemon to start
sleep 2

# Start the UI (assuming npm run dev or a local server)
# In a real production app, we'd serve the ui/dist folder using a small web server
echo "Starting NetPull UI..."
cd "$DIR/ui" && npm run dev &
UI_PID=$!

# Start the tray icon
echo "Starting System Tray..."
"$DIR/venv/bin/python3" "$DIR/daemon/tray.py" &
TRAY_PID=$!

# Function to handle exit
cleanup() {
    echo "Shutting down NetPull..."
    kill $DAEMON_PID
    kill $UI_PID
    kill $TRAY_PID
    exit
}

trap cleanup SIGINT SIGTERM

echo "NetPull is running! Press Ctrl+C to exit."
wait
