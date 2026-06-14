# pup-lost-and-found

**iBalik** — AI-powered Lost & Found Management System for PUP Parañaque.

## Quick start

```bash
npm install
npm start
```

Open http://localhost:3000 — single-page app with all **20 iBalik modules** (home, browse, item details, AI matches, reports, claims, notifications, profile, admin dashboard, pending reports, claim verification, users, AI monitoring, analytics, audit logs, login, register, FAQ).

Use the maroon **Guest / Student / Admin** bar at the top to switch roles. The module strip on the home page jumps to any screen.

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
