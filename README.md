# Signal Clone

A Signal-inspired messaging demo with a Next.js frontend, FastAPI backend, SQLite database, and WebSocket messaging. Phone verification and encryption are mocked for this assignment.

## Run locally

1. Backend: from `backend/`, install `requirements.txt`, then run `uvicorn main:app --reload --port 8000`.
2. Frontend: from `frontend/`, run `npm install`, copy `.env.example` to `.env.local`, and run `npm run dev`.
3. Open `http://localhost:3000`. To load the sample accounts and chats, run `python seed.py` once from `backend/`.

The seeded demo accounts are `diya`, `alice`, `bob`, and `charlie`; the mock verification code is `123456`. Login is username/phone plus this code. Use separate browser profiles to preview conversations as different users.

## Deploy

### Backend on Render

1. Push this project to a GitHub repository and create a Render Blueprint from the repository. The root `render.yaml` creates the FastAPI service and a persistent disk for SQLite.
2. Once Render shows the API URL, set `FRONTEND_ORIGINS` on the Render service to the exact deployed frontend origin (for example `https://your-project.vercel.app`), then redeploy.
3. Seed the hosted database once from the Render shell by running `python seed.py` from the `backend/` service directory.

### Frontend on Vercel

1. Import the same repository into Vercel and set the project Root Directory to `frontend`.
2. Add `NEXT_PUBLIC_API_URL` with the Render API URL, for example `https://signal-clone-api.onrender.com`, then deploy.

The Render configuration sets secure cross-site cookies and permits Vercel preview domains for CORS. Set `FRONTEND_ORIGINS` to the production Vercel origin so production access is explicitly allowed. The frontend uses that API URL for both HTTP requests and WebSockets.

## Data and architecture

- `frontend/`: Next.js App Router UI; `NEXT_PUBLIC_API_URL` selects the API host.
- `backend/`: FastAPI routes for authentication, contacts, conversations, and messages; `/ws/{conversation_id}` handles live chat events.
- `backend/database.py`: SQLAlchemy database engine. `DATABASE_URL` selects the database; SQLite is used by default and on Render's persistent disk.
- `backend/models.py`: users, sessions, conversations, memberships, messages, contacts, and read receipts.
- `backend/seed.py`: inserts the local demo users and sample conversations. Run once against an empty database; it is not an idempotent migration.

Sessions are stored in the database and sent as an HTTP-only cookie. Production uses `SameSite=None; Secure` because the Vercel and Render hostnames differ. WebSocket connections use the same cookie for authentication. This demo does not provide real end-to-end encryption.
