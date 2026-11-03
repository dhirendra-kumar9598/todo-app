# To-Do API

REST API for the To-Do List app — Node.js, Express 5, MongoDB (Mongoose), Zod validation.

## Setup

```bash
cd server                 # requires Node >= 22.9
npm install
cp .env.example .env      # set MONGODB_URI (local MongoDB or Atlas)
npm run dev               # http://localhost:4000
# optional sample data for one browser (id from localStorage.getItem('todo:client-id')):
npm run seed -- --client=<uuid>
npm test                  # runs against an in-memory MongoDB
```

| Variable      | Default | Description                                      |
| ------------- | ------- | ------------------------------------------------ |
| `PORT`        | `4000`  | HTTP port                                        |
| `MONGODB_URI` | —       | MongoDB connection string (required)             |
| `CORS_ORIGIN` | `*`     | Comma-separated allowed origins, or `*`. **Must be explicit in production** (startup fails otherwise) |
| `RATE_LIMIT_PER_MINUTE` | `300` | Requests per minute per IP on `/api/tasks` (429 when exceeded) |
| `NODE_ENV`    | —       | `production` hides internal error messages and trusts the proxy's `X-Forwarded-For` |

## Clients

There are no accounts. Every `/api/tasks` request must send an **`X-Client-Id`** header containing a
UUID; the frontend generates one per browser and keeps it in localStorage. All tasks are stored with
that id and every query is scoped to it, so visitors only ever see their own tasks. Requests without a
valid id get `400`; another client's task ids return `404`.

## Task model

| Field         | Type                          | Notes                                  |
| ------------- | ----------------------------- | -------------------------------------- |
| `id`          | string                        |                                        |
| `title`       | string                        | **required**, max 120                  |
| `description` | string                        | optional, max 2000                     |
| `startAt`     | ISO date                      | **required** — task date + start time  |
| `endAt`       | ISO date \| null              | optional, must be ≥ `startAt` (may be the next day) |
| `priority`    | `low` \| `medium` \| `high` \| null | optional                         |
| `status`      | `in_progress` \| `completed`  | default `in_progress`                  |
| `completedAt` | ISO date \| null              | set automatically                      |
| `createdAt`, `updatedAt` | ISO date           | set automatically                      |

Dates are stored in UTC. Week endpoints take a `tz` (IANA name, e.g. `Asia/Kolkata`) so weeks are
grouped **Monday 00:00 → Sunday 23:59** in the user's local time.

## Endpoints

All responses are JSON: `{ "data": ... }` on success, `{ "error": { "message", "details?" } }` on failure.

| Method | Path                  | Description |
| ------ | --------------------- | ----------- |
| GET    | `/api/health`         | `200` when the DB is connected, `503` otherwise (use as the platform health check) |
| GET    | `/api/tasks`          | List tasks. Query: `from`, `to` (date range on `startAt`, `to` exclusive), `status`, `priority`, `q`, `sort` (`startAt`, `-startAt`, `createdAt`, `-createdAt`), `limit` (≤500) |
| GET    | `/api/tasks/search`   | Keyword search on title + description (case-insensitive, partial). Query: `q` (required), `limit` (≤100, default 50). `meta.hasMore` is true when results were cut off |
| GET    | `/api/tasks/summary`  | Stats for the Mon–Sun week containing `date` (default now). Query: `date`, `tz`. Returns `weekStart`, `weekEnd`, `total`, `completed`, `open`, `progress` (%) |
| GET    | `/api/tasks/weeks`    | Every week that has tasks with `weekStart`, `weekEnd`, `total`, `completed`, `open`. Query: `tz`, `from`, `to` |
| GET    | `/api/tasks/:id`      | Get one task |
| POST   | `/api/tasks`          | Create — body: `title`, `startAt`, optional `description`, `endAt`, `priority`, `status` |
| PATCH  | `/api/tasks/:id`      | Partial update of any field (e.g. `{ "status": "completed" }`) |
| DELETE | `/api/tasks/:id`      | Delete → `204` |

### Examples

```bash
ID=$(uuidgen | tr A-Z a-z)   # any UUID works as a client id

curl -X POST localhost:4000/api/tasks -H "X-Client-Id: $ID" -H 'Content-Type: application/json' \
  -d '{"title":"Doing Homework","startAt":"2026-01-14T10:00:00+05:30","endAt":"2026-01-14T11:00:00+05:30","priority":"high"}'

curl -X PATCH localhost:4000/api/tasks/<id> -H "X-Client-Id: $ID" -H 'Content-Type: application/json' -d '{"status":"completed"}'

curl -H "X-Client-Id: $ID" 'localhost:4000/api/tasks/summary?tz=Asia/Kolkata'
curl -H "X-Client-Id: $ID" 'localhost:4000/api/tasks/search?q=finish'
```

## Structure

```
src/
  app.js                      Express app (middleware, routes, error handling)
  index.js                    Entry: connect DB, start server, graceful shutdown
  config/db.js
  models/Task.js
  validation/task.schemas.js  Zod schemas for bodies, params, queries
  middleware/                 requireClient (X-Client-Id), validate(), notFound, errorHandler
  controllers/task.controller.js
  routes/task.routes.js
  utils/week.js               Time-zone aware Monday–Sunday week range
scripts/seed.js
test/tasks.test.js
```
