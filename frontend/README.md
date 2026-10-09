# Signal Clone

A Signal-inspired messaging demo built with Next.js, FastAPI, SQLite, and WebSockets.

## Run locally

Start the backend in one terminal:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Mock verification uses OTP `123456`. Create an account or sign in with an existing username or phone number. The included SQLite database has a demo account named `diya`.

## Included

- Username or phone registration and login with a persistent session cookie
- Display name and profile avatar
- Contact search, add, and one-to-one conversations
- Persistent direct and group messages with timestamps, delivery/read receipts, and typing/presence events
- Group creation, member list, and admin member management
- Unread filtering, conversation search, settings placeholders, and coming-soon call/device/story actions

Phone verification and end-to-end encryption are mocked. Calls, stories, and linked devices are placeholders.
