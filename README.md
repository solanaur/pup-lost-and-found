# pup-lost-and-found

**iBalik** — AI-powered Lost & Found Management System for PUP Parañaque.

## Quick start

```bash
npm install
npm start
```

Open http://localhost:3000

**Demo login** (password: `password`):

- Student: `2021-00001-PQ-0`
- Admin: `admin`

## Stack

- Node.js + Express API (`server/`)
- JSON file store (`data/store.json`, created on first run)
- SPA frontend (`public/`)

Optional: Python FastAPI backend in `backend/` (requires MySQL).

## Environment

Copy `.env.example` to `.env` and set `JWT_SECRET`. Optional: `OPENAI_API_KEY` for AI report enrichment.
