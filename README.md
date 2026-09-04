# voice-to-note

Proof-of-concept web app scaffold for turning voice memos into structured clinical notes.

The backend will use FastAPI, and the frontend will use Vite, React, TypeScript, and Tailwind CSS. There is no database, authentication, or patient tagging in this project.

## Setup

### Backend

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

### Frontend

In a second terminal:

```sh
cd frontend
npm install
npm run dev
```

Implementation files are intentionally empty placeholders for now.
