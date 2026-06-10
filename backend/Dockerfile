FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY app ./app
COPY scripts ./scripts

# Ensure init_db can be run as module from /app
ENV PYTHONPATH=/app

# entrypoint runs init_db then uvicorn (Python avoids Windows CRLF issues)
COPY entrypoint.py /entrypoint.py
EXPOSE 8000
ENTRYPOINT ["python", "/entrypoint.py"]
