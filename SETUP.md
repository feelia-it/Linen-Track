# Uniform Management Setup

The project has a FastAPI backend, a React frontend, and MongoDB for storage.

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer
- Yarn 1.x or npm
- MongoDB running locally, or a MongoDB Atlas connection string

## Backend

From the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python ../scripts/seed_db.py
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API is available at `http://localhost:8000`. The health endpoint is `http://localhost:8000/api/health`, and interactive API documentation is at `http://localhost:8000/docs`.

The local `backend/.env` is already configured for MongoDB on `localhost:27017`. For another database, copy the values from `backend/.env.example` into `backend/.env` and update them. Google OAuth values are optional for starting the API but required for Google sign-in.

## Frontend

Open a second terminal at the repository root:

```bash
cd frontend
yarn install
yarn start
```

The frontend is available at `http://localhost:3000`. If Yarn is unavailable, use `npm install` and `npm start` instead.

The local `frontend/.env` points to the backend at `http://localhost:8000`. Update `REACT_APP_BACKEND_URL` when the API runs elsewhere. `REACT_APP_GOOGLE_CLIENT_ID` must be set to the matching Google OAuth client ID for browser-side Google sign-in.

## MongoDB Atlas

Set `MONGO_URL` in `backend/.env` to the Atlas connection string, keep `DB_NAME` as the desired database name, and ensure the machine running the backend is allowed in the Atlas network access list. Then run the seed command and start the API as above.

## Test session login

For local API testing without Google OAuth, follow [auth_testing.md](auth_testing.md). The frontend still expects a valid session cookie from the backend.