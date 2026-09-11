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

The backend virtual environment lives at `backend/.venv`. The disposable `throwaway/` folder is not required to run the app.

### Frontend

In a second terminal:

```sh
cd frontend
npm install
npm run dev
```

### Start both services

From the project root, run:

```sh
./start.sh
```

This starts the backend and frontend together and opens the app at http://localhost:5173. Press Ctrl+C to stop both services.

Implementation files are intentionally empty placeholders for now.
