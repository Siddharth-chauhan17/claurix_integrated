# Insurify

AI-native commercial insurance workflow platform — policy analysis, authentication, and placement workflows.

## Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL
- **Auth:** JWT (cookie + Bearer), Google OAuth
- **Infra:** Docker Compose (Postgres + API)

## Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (optional, recommended for DB + API)

## Quick start

### 1. Environment

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Edit `.env` and `backend/.env` with your `SECRET_KEY` and Google OAuth credentials if using Google sign-in.

### 2. With Docker (API + database)

```bash
docker compose up --build
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

### 3. Frontend

```bash
npm install
npm run dev
```

App: http://localhost:3000

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local` if needed (default in code).

### 4. Backend (local, without Docker)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Ensure PostgreSQL is running and DATABASE_URL is set in backend/.env
uvicorn app.main:app --reload --port 8000
```

## Project structure

```
insurify/
├── app/                 # Next.js pages (analyze, auth, dashboard)
├── components/          # React UI
├── lib/                 # API client
├── backend/
│   ├── app/             # FastAPI app (auth, models, config)
│   ├── routes/          # Analysis routes
│   ├── services/        # AI service integration
│   └── scripts/         # DB init
└── docker-compose.yml
```

## Main API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup`, `/auth/login` | Email auth |
| GET | `/auth/google` | Google OAuth |
| GET | `/auth/me` | Current user |
| POST | `/analyze-policy` | Upload policy PDF |
| GET | `/history` | Analysis history |

## License

Private / all rights reserved unless otherwise specified by the repository owner.
