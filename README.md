# RepoLens

Monorepo for the RepoLens project.

## Structure

```
.
├── backend/    # FastAPI API
└── frontend/   # Next.js web app
```

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Health check: `GET http://localhost:8000/health`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:3000`
