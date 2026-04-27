import time
import pyperclip
import requests
import logging
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NetPull.ClipboardWatcher")

API_BASE = "http://localhost:8000"

def is_url(text):
    url_pattern = re.compile(
        r'^(?:http|ftp)s?://' # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|' # domain...
        r'localhost|' # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})' # ...or ip
        r'(?::\d+)?' # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    return re.match(url_pattern, text) is not None

def main():
    logger.info("Clipboard watcher started. Copy a URL to see it in NetPull!")
    last_clipboard = ""
    
    while True:
        try:
            current_clipboard = pyperclip.paste().strip()
            if current_clipboard != last_clipboard:
                last_clipboard = current_clipboard
                if is_url(current_clipboard) or current_clipboard.startswith("magnet:?"):
                    logger.info(f"Found URL in clipboard: {current_clipboard}")
                    # In a real app, we'd trigger a notification or send to the daemon
                    # For now, let's just log it. 
                    # We could also automatically add it:
                    # requests.post(f"{API_BASE}/downloads/", json={"url": current_clipboard, "protocol_type": "http"})
            
            time.sleep(1)
        except KeyboardInterrupt:
            break
        except Exception as e:
            logger.error(f"Error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
