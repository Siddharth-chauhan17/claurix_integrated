FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code and Alembic
COPY app ./app
COPY scripts ./scripts
COPY alembic ./alembic
COPY alembic.ini .

ENV PYTHONPATH=/app

# Migrations then uvicorn (Python entrypoint avoids Windows CRLF issues)
COPY entrypoint.py /entrypoint.py
EXPOSE 8000
ENTRYPOINT ["python", "/entrypoint.py"]
