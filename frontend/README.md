# Inventory & Warehouse Management System — Frontend

## Setup

Install dependencies with `npm install`. Copy `.env.example` to `.env` if needed
and set `VITE_API_URL=http://localhost:5000/api`.

Run the development server with `npm run dev`, or create a production build with
`npm run build`.

The backend must allow `http://localhost:5173` via its `FRONTEND_URL` setting.
For Vercel, set `VITE_API_URL` to the backend project's stable production URL
ending in `/api`; do not use a deployment-specific preview URL.
