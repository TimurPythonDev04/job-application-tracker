# Job Application Tracker

A full-stack web app for tracking my own Werkstudent/Praktikum job applications:
a Kanban board to move applications through stages, an analytics dashboard for
conversion rates, and a reminder command for applications that have gone
quiet.

**Live demo:** _add the Vercel URL here after deployment_
**Backend API:** _add the Render URL here after deployment_

## Screenshots

> Add screenshots here once the app has real data in it, e.g.:
> `docs/screenshots/board.png` — the Kanban board with a few cards
> `docs/screenshots/analytics.png` — the analytics dashboard with charts
> `docs/screenshots/login.png` — the login screen

## Tech stack

**Backend:** Python, Django, Django REST Framework, `djangorestframework-simplejwt`
(JWT auth), PostgreSQL in production / SQLite for local dev, pytest.

**Frontend:** React, TypeScript, Vite, `@dnd-kit` (drag-and-drop), Recharts,
React Router, Axios.

**Infra:** Docker + docker-compose for local development, GitHub Actions for
CI, Render (backend + Postgres) and Vercel (frontend) for deployment.

## Features

- **Auth:** register / log in / log out with JWT access + refresh tokens.
- **Job applications:** create, edit, delete; track company, position,
  status, applied date, job posting URL, and free-text notes.
- **Kanban board:** drag a card between Applied / Interview / Offer /
  Rejected columns; the drop updates the application's status via the API.
- **Analytics:** counts per status, applied→interview and interview→offer
  conversion rates, and a chart of applications submitted per week.
- **Stale application reminder:** a management command
  (`find_stale_applications`) that lists open applications with no update in
  N+ days, meant to be run by hand or from a scheduled job.

## Architecture & key decisions

A few decisions worth being able to talk through:

- **JWT instead of session auth.** The frontend (Vercel) and backend (Render)
  live on different origins. Session cookies would need `SameSite=None` +
  `Secure` cross-site cookies, which is fragile across free hosting tiers and
  harder to reason about. A stateless Bearer token in the `Authorization`
  header sidesteps cross-site cookie issues entirely and is the conventional
  choice for a decoupled SPA + API.

- **Access token in memory, refresh token in `localStorage`.** The access
  token (short-lived, 30 min) is kept only in a JS variable, never written to
  storage, which limits what a hypothetical XSS payload could read after the
  fact. The refresh token (7 days) is persisted so users aren't logged out on
  every reload, but it's rotated and blacklisted on every use
  (`ROTATE_REFRESH_TOKENS` / `BLACKLIST_AFTER_ROTATION`), so a leaked refresh
  token stops working the next time the real session refreshes.

- **Ownership enforced twice, on purpose.** Every queryset in the API is
  scoped to `request.user` (`JobApplication.objects.filter(owner=...)`), so a
  request for another user's application id returns `404`, not `403` — the
  API never confirms the object even exists. On top of that, an object-level
  `IsOwner` permission is attached to the viewset as defense-in-depth, so a
  future endpoint that forgets to filter its queryset still fails closed
  instead of leaking data. The `owner` field is also excluded from the
  serializer entirely (not just read-only), so it can't be set via the
  request body — that's what stops mass-assignment on create.

- **SQLite for local dev, Postgres in Docker/production**, switched purely by
  the presence of a `DATABASE_URL` env var (via `dj-database-url`). Keeps
  local setup to "install deps, run migrate" with zero external services,
  while staying on the real production database engine once Docker or Render
  are involved.

- **No Celery for the reminder feature.** A full task queue would need a
  broker (Redis) and a worker process, which meaningfully complicates the
  deploy for a feature that's just "list applications older than N days".
  It's a plain Django management command instead, runnable by hand or wired
  to any scheduler (a Render cron job, system crontab, GitHub Actions
  schedule) without adding infrastructure.

## Project structure

```
job-tracker/
├── backend/            # Django + DRF API
│   ├── accounts/       # registration, JWT auth endpoints
│   ├── tracker/        # JobApplication model, API, analytics, tests
│   └── config/         # settings, root urls
├── frontend/            # React + TypeScript (Vite)
│   └── src/
│       ├── api/         # axios client, JWT refresh logic
│       ├── auth/        # auth context, route guard
│       ├── components/  # Kanban board pieces, modal, navbar
│       └── pages/        # board, analytics, login, register
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Running locally

### Option A: Docker (recommended)

Requires Docker Desktop.

```bash
docker compose up --build
```

This starts Postgres, the Django API (`http://localhost:8000`) and the React
app (`http://localhost:5173`), with migrations applied automatically.

### Option B: without Docker

**Backend** (Python 3.12+):

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # macOS/Linux
pip install -r requirements-dev.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

**Frontend** (Node 20+), in a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Running the tests

```bash
cd backend
pytest                       # full suite
pytest --cov=tracker --cov=accounts   # with coverage
```

The suite covers models, registration/login/token-refresh, CRUD on job
applications, the analytics endpoint, the stale-applications command, and —
specifically — ownership: a set of tests in `tracker/tests/test_ownership.py`
proves one user can't read, list, edit, or delete another user's
applications, and that the `owner` field can't be set via the request body.

## Checking for stale applications

```bash
python manage.py find_stale_applications --days 14
python manage.py find_stale_applications --days 14 --user alice
```

## Environment variables

See `backend/.env.example` and `frontend/.env.example`. Nothing secret is
committed; `SECRET_KEY` in production is generated by Render, not stored in
the repo.

## Deployment

- **Backend:** Render, using `render.yaml` (Blueprint) — a free Postgres
  instance plus a Python web service running `gunicorn`.
- **Frontend:** Vercel, building `frontend/` as the project root with
  `VITE_API_URL` pointing at the deployed backend.

CI (`.github/workflows/ci.yml`) runs the backend test suite against Postgres
and the frontend lint/typecheck/build on every push and pull request to
`main`.
