import pystray
from pystray import MenuItem as item
from PIL import Image
import os
import webbrowser
import signal
import subprocess

def create_image():
    # Use the generated logo if exists, otherwise create a placeholder
    icon_path = "browser-ext/icons/icon48.png"
    if os.path.exists(icon_path):
        return Image.open(icon_path)
    else:
        # Create a simple blue square if logo not found
        image = Image.new('RGB', (64, 64), (15, 23, 42))
        return image

def on_open_ui(icon, item):
    webbrowser.open("http://localhost:5173")

def on_exit(icon, item):
    icon.stop()
    # Find and kill the daemon process
    # This is a bit crude but works for a prototype
    os.kill(os.getpid(), signal.SIGTERM)

def setup_tray():
    menu = (
        item('Open Dashboard', on_open_ui),
        item('Exit NetPull', on_exit),
    )
    
    icon = pystray.Icon("NetPull", create_image(), "NetPull", menu)
    icon.run()

if __name__ == "__main__":
    setup_tray()
