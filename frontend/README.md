ITSM Portal Frontend

This is a minimal React + Vite frontend for the ITSM Portal backend.

Quick start

1. Install dependencies

   cd frontend
   npm install

2. Configure API base URL (optional)

   Create a file: .env
   Add: VITE_API_BASE_URL=https://localhost:7286

3. Run dev server

   npm run dev

Notes
- This frontend uses localStorage to store the JWT returned by /api/auth/login. It's simple and works for development but is vulnerable to XSS. For production, prefer HttpOnly cookies and a refresh-token flow.
- The frontend expects the backend to be running and CORS to allow the dev origin (http://localhost:5173).
