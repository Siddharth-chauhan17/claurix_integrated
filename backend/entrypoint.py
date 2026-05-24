"""Run init_db then start uvicorn. Used as Docker entrypoint."""
import os
import sys

def main():
    # Ensure app is on path for init_db and uvicorn
    sys.path.insert(0, "/app")
    os.chdir("/app")
    from scripts.init_db import init_db
    init_db()
    # Start uvicorn (replace current process)
    os.execvp("uvicorn", ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"])

if __name__ == "__main__":
    main()
