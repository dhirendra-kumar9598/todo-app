# To-Do — Frontend

Mobile-first React UI for the To-Do List app, built from the Figma design.

**Stack:** Vite · React 19 · Tailwind CSS v4 · React Router · TanStack Query · date-fns

## Run locally

```bash
# 1. API (see ../server) must be running on http://localhost:4000
# 2. Frontend
cd client
npm install
npm run dev        # http://localhost:5173  (/api is proxied to :4000)
npm run build      # production build in dist/
```

Set `VITE_API_URL` (see `.env.example`) when the API is hosted elsewhere, e.g.
`https://your-api.onrender.com/api`.

## Screens

| Route      | Screen |
| ---------- | ------ |
| `/welcome` | Onboarding (shown once) |
| `/`        | Home — Mon–Sun week strip, Task Complete / Pending cards, Weekly Progress, tasks for the selected day |
| `/search`  | Search by title/description; view, edit, complete or delete from results |
| `/weeks`   | "View All" — one card per week (open vs completed); tap to expand its tasks |

The **Add / Edit / View** task bottom sheet opens from any screen (＋ button, pencil icon, or tapping a task).

## Interactions

- **Complete / In Progress:** tick the checkbox — counts and progress update instantly (optimistic update, rolled back on error).
- **Delete:** swipe a task left (touch or mouse drag) and tap **Delete**, or tap the trash icon to reveal the same action.
- **Weeks:** swipe the week strip or use the chevrons; arrow keys move between days. The selected day is kept in the URL (`/?date=yyyy-MM-dd`).
- Weeks are grouped in the user's local time zone (sent to the API as `tz`).
- **Per-browser lists:** no sign-up; the app creates an anonymous id (`localStorage['todo:client-id']`) and sends it as `X-Client-Id`, so each visitor only sees their own tasks.
- **Overnight tasks:** an end time earlier than the start time means the task ends the next day ("10:00 PM – 2:00 AM (+1 day)").

## Deploy (Netlify)

- Base directory: `client` · Build command: `npm run build` · Publish directory: `client/dist`
- Environment variable: `VITE_API_URL=https://<your-api-host>/api` (if it's missing, the app shows *"Unexpected response from the server. Is the API URL configured?"*)
- `public/_redirects` handles SPA routing.
