import sys
import urllib.request

endpoints = ["http://localhost:8000/api/v1/health", "http://localhost:8000/health"]

for url in endpoints:
    try:
        with urllib.request.urlopen(url, timeout=3) as resp:
            if resp.status == 200:
                sys.exit(0)
    except Exception:
        continue

sys.exit(1)
