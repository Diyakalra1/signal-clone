# Signal Clone

A Signal-inspired messaging demo with a Next.js frontend, FastAPI backend, SQLite database, and WebSocket messaging. Phone verification and encryption are mocked for this assignment.

## Run locally

1. Backend: from `backend/`, install `requirements.txt`, then run `uvicorn main:app --reload --port 8000`.
2. Frontend: from `frontend/`, run `npm install`, copy `.env.example` to `.env.local`, and run `npm run dev`.
3. Open `http://localhost:3000`. To load the sample accounts and chats, run `python seed.py` once from `backend/`.

The seeded demo accounts are `diya`, `alice`, `bob`, and `charlie`; the mock verification code is `123456`. Login is username/phone plus this code. Use separate browser profiles to preview conversations as different users.

## Deploy

### Backend on Render

1. Create a free PostgreSQL project on Neon and copy its pooled connection string.
2. Create a Render Blueprint from this repository. The root `render.yaml` creates a free FastAPI service.
3. During setup, set `DATABASE_URL` to the Neon connection string and `FRONTEND_ORIGINS` to the exact frontend origin (for example `https://your-project.vercel.app`). Demo data seeds automatically once when the database is empty.

### Frontend on Vercel

1. Import the same repository into Vercel and set the project Root Directory to `frontend`.
2. Add `NEXT_PUBLIC_API_URL` with the Render API URL, for example `https://signal-clone-api.onrender.com`, then deploy.

The Render configuration sets secure cross-site cookies and permits Vercel preview domains for CORS. The free Render service may sleep after inactivity, so its first request can be slow. Neon Free currently has usage limits and compute scales to zero; check its current limits before deploying. The frontend uses the configured API URL for both HTTP requests and WebSockets.

## Data and architecture

- `frontend/`: Next.js App Router UI; `NEXT_PUBLIC_API_URL` selects the API host.
- `backend/`: FastAPI routes for authentication, contacts, conversations, and messages; `/ws/{conversation_id}` handles live chat events.
- `backend/database.py`: SQLAlchemy database engine. `DATABASE_URL` selects the database; SQLite is used locally and PostgreSQL on the free hosted setup.
- `backend/models.py`: users, sessions, conversations, memberships, messages, contacts, and read receipts.
- `backend/seed.py`: inserts the demo users and sample conversations. Hosted seeding runs once when `SEED_DEMO_DATA=true` and the database is empty.

Sessions are stored in the database and sent as an HTTP-only cookie. Production uses `SameSite=None; Secure` because the Vercel and Render hostnames differ. WebSocket connections use the same cookie for authentication. This demo does not provide real end-to-end encryption.
