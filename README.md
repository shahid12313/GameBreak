# GameBreak — Gaming Lounge Management System

A complete system for running a gaming lounge: a public website where customers
browse games and book sessions, a private admin dashboard where staff run the
counter and see the numbers, and one backend API that both talk to.

This README takes you from nothing installed to a live, deployed system,
in order. Follow it top to bottom the first time.

## 1. Project Overview

This is three separate applications that work together:

| App | What it is | Who uses it | Folder |
|---|---|---|---|
| **frontend** | The public website | Customers, anyone with the link | `frontend/` |
| **dashboard** | The admin/owner dashboard | Your staff, logged in | `dashboard/` |
| **backend** | The API, database access, and all business logic | Both apps talk to it; nobody visits it directly | `backend/` |

**Why three separate apps, not one?** A customer on the public website should
never be able to reach admin pages just by guessing a URL — so the admin
dashboard isn't part of the public site's code at all; it's a different
application, usually on a different address entirely (e.g.
`admin.yourlounge.com` instead of `yourlounge.com`). The backend is the only
thing that ever touches the database directly. The frontend and dashboard
never do — they always go through the backend's API, which checks who's
asking and what they're allowed to do before touching MongoDB.

```
Customer  →  frontend (React)   →  backend (Express API)  →  MongoDB
Staff     →  dashboard (React)  →  backend (Express API)  →  MongoDB
```

**How money is calculated.** A session is billed for the time actually used,
at the per-minute rate implied by whatever price is set — not a flat price
just because a duration was selected. Stop a "1 Hour / PKR 500" session after
20 minutes and it bills roughly PKR 167, not the full 500. This math lives in
one place, `backend/src/utils/billing.js`, and both the live "how much so
far" display and the final bill use it, so they can never disagree.

## 2. Requirements

Before you start, install:

- **Node.js** version 18 or later, which includes **npm**. Get it from
  [nodejs.org](https://nodejs.org).
- **Git**, to download this project and, later, to deploy it.
- A **MongoDB Atlas** account (free) — or a local MongoDB installation if you
  prefer to develop offline. Part 6 covers both.

Check Node and npm are installed:

```
node -v
npm -v
```

Both should print a version number. If either command isn't found, install
Node.js first.

## 3. Project Structure

```
gaming-lounge/
├── backend/
│   ├── src/
│   │   ├── config/        env.js — loads and validates environment variables
│   │   ├── controllers/   one file per resource — the actual logic
│   │   ├── middleware/    staffAuth.js, customerAuth.js, errorHandler.js
│   │   ├── models/        one Mongoose schema per file
│   │   ├── routes/        one Express router per resource
│   │   ├── utils/         billing.js, pricing.js, bookingRef.js, asyncHandler.js
│   │   ├── app.js         builds the Express app (no DB connection here)
│   │   ├── server.js      connects to MongoDB, then starts app.js listening
│   │   └── seed.js        creates default games/pricing (and optional demo data)
│   ├── tests/             automated tests (see Part 19, "Testing")
│   ├── .env.example
│   └── package.json
├── frontend/               the public website (React + Vite)
│   ├── src/
│   │   ├── pages/          Home, Games, Stations, Pricing, BookSession, Events,
│   │   │                   About, Contact, CustomerLogin, CustomerRegister,
│   │   │                   CustomerAccount, MyBookings
│   │   ├── layouts/        SiteLayout.jsx — the top nav and footer
│   │   ├── context/        CustomerAuthContext.jsx
│   │   ├── services/       api.js — the one place Axios is configured
│   │   └── styles/         theme.css
│   ├── .env.example
│   └── package.json
├── dashboard/              the admin dashboard (a separate React + Vite app)
│   ├── src/
│   │   ├── pages/          DashboardHome, LiveSessions, Customers, Bookings,
│   │   │                   WaitingList, Pricing, Discounts, Revenue, Expenses,
│   │   │                   Inventory, Events, Staff, Settings, Login
│   │   ├── layouts/        DashboardLayout.jsx — the sidebar
│   │   ├── routes/         ProtectedRoute.jsx — blocks pages behind a login
│   │   ├── context/        AuthContext.jsx
│   │   ├── services/       api.js
│   │   └── styles/         theme.css
│   ├── .env.example
│   └── package.json
└── README.md               this file
```

## 4. Step 1 — Get the project

If you were given this as a folder or a zip file, unzip it and open a
terminal inside the `gaming-lounge` folder. If it's a Git repository:

```
git clone <the repository URL>
cd gaming-lounge
```

## 5. Step 2 — Install dependencies

Each of the three apps has its own dependencies:

```
cd backend
npm install
cd ../frontend
npm install
cd ../dashboard
npm install
```

## 6. Step 3 — Configure MongoDB

You need one MongoDB database. Pick one option:

### Option A — MongoDB Atlas (recommended, free)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and
   create a free account.
2. Create a new project, then **Build a Database** → choose the **free M0**
   tier → pick any cloud provider and region close to you → **Create**.
3. **Create a database user**: under Security → Database Access → Add New
   Database User. Choose a username and password (save the password — you'll
   need it in a moment). Give it read/write access.
4. **Configure network access**: under Security → Network Access → Add IP
   Address. For getting started, choose **Allow access from anywhere**
   (`0.0.0.0/0`) — you can restrict this later once you know your backend
   host's IP range.
5. **Get your connection string**: go to Database → Connect → Drivers, copy
   the string that looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<username>` and `<password>` with the database user you created,
   and add a database name before the `?`, e.g. `.../gamebreak?retryWrites=...`.

### Option B — Local MongoDB

Install MongoDB Community Server for your OS from
[mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
and start it. Your connection string is `mongodb://127.0.0.1:27017/gamebreak`.

**Important if you use a local MongoDB:** billing a session uses a database
transaction (so that deducting stock, recording payment, and closing the
session either all happen or none do). Transactions require MongoDB to be
running as a **replica set**, even a one-node one — a plain standalone
`mongod` will reject them. Atlas is always a replica set automatically, so
this only matters for local MongoDB. To enable it locally, start `mongod`
with `--replSet rs0`, then run `mongosh` and execute `rs.initiate()` once.

## 7. Step 4 — Configure environment variables

Each app reads its settings from a `.env` file, which you create by copying
the provided `.env.example`.

### backend/.env

```
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```
MONGO_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/gamebreak?retryWrites=true&w=majority
JWT_SECRET=paste-a-long-random-string-here
PORT=5000
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

- `MONGO_URI` — your connection string from Part 6.
- `JWT_SECRET` — signs login tokens. Generate one with:
  ```
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `PORT` — which port the API listens on locally. `5000` matches the other
  two apps' default `.env.example` files, so leave it unless you have a
  reason to change it.
- `CORS_ORIGINS` — a comma-separated list of the *exact* addresses allowed to
  call this API. This must never be `*` in production (see Part 17). For
  local development, the two Vite dev server addresses shown above are
  correct as-is.

### frontend/.env

```
cd ../frontend
cp .env.example .env
```

```
VITE_API_URL=http://localhost:5000/api
VITE_DASHBOARD_URL=http://localhost:5174
```

`VITE_DASHBOARD_URL` is only used for the "Admin" button in the top
navigation — it's a full link to wherever the dashboard is running, since
it's a separate application.

### dashboard/.env

```
cd ../dashboard
cp .env.example .env
```

```
VITE_API_URL=http://localhost:5000/api
```

**Never commit real `.env` files to Git.** Each folder's `.gitignore`
already excludes them — only the `.env.example` templates are meant to be
shared.

## 8. Step 5 — Create the first admin account

There's no `seed:admin` script to run with a password baked into a command —
instead, the **first time you open the dashboard**, it detects that no staff
account exists yet and shows a **"Create the first owner account"** form
right on the login screen. Fill in your name, email and a password there.
That account is created with the **Owner** role, which can do everything,
including adding the rest of your staff afterwards (see the dashboard's
**Staff** page). This is covered in Part 11, once the backend and dashboard
are both running.

Separately, `npm run seed` (run from `backend/`) creates the four default
games (PS4 Pro, PS5, Driving Simulator, PC) with starting prices, if none
exist yet — it's optional but saves you setting up games by hand. See Part
14, "Database Seed Data", for details and the demo-data option.

## 9. Step 6 — Start the backend

```
cd backend
npm run dev
```

Expected output:

```
MongoDB connected
Server running on port 5000
```

If you see a MongoDB connection error instead, see Part 18, Troubleshooting.
Leave this running — open a new terminal for the next step.

## 10. Step 7 — Start the public website

In a new terminal:

```
cd frontend
npm run dev
```

Open **http://localhost:5173** — you should see the GameBreak homepage.

## 11. Step 8 — Start the admin dashboard

In another new terminal:

```
cd dashboard
npm run dev
```

Open **http://localhost:5174**. The first time, you'll see the "Create the
first owner account" form described in Part 8 — fill it in and you're
signed in as Owner.

You now have all three pieces running locally: backend on `5000`, public
site on `5173`, dashboard on `5174`.

## 12. Step 9 — Test the complete system

Work through this checklist. All of it should work end to end, with real
data actually saved in MongoDB.

- [ ] Backend connects to MongoDB (`MongoDB connected` in its terminal)
- [ ] The dashboard's first-run screen lets you create the Owner account
- [ ] In the dashboard, **Pricing** lets you add a game and a price for it
- [ ] A customer can register on the public site (`/register`)
- [ ] A customer can log in (`/login`)
- [ ] A customer can view games and pricing on the public site
- [ ] A customer can create a booking (`/book`)
- [ ] That booking appears in the dashboard's **Web Bookings** page
- [ ] A customer can see it under their own **My Bookings**
- [ ] In the dashboard, **Live Sessions** lets you start a session on a
      free station
- [ ] Stopping a session bills it and frees the station again
- [ ] **Revenue** shows that session's amount, and **Download Excel**
      produces a real spreadsheet
- [ ] **Expenses** and **Inventory** let you add and remove entries
- [ ] **Events** lets you create an event, and it's registerable from the
      public site's Events page
- [ ] A customer visiting the dashboard's URL directly, with no login, is
      sent to the login screen — not shown any admin page
- [ ] Calling the API directly with no `Authorization` header (e.g.
      `curl http://localhost:5000/api/games`) returns `401`, not data

## 13. Step 10 — Production build

Build the two frontends (the backend doesn't need a build step — Node runs
its source directly):

```
cd frontend
npm run build
cd ../dashboard
npm run build
```

Each produces a `dist/` folder: a handful of static files (`index.html`,
plus hashed `.js`/`.css` files under `dist/assets/`) with no server-side
code — this is what you upload to static hosting in Part 15. The
`VITE_API_URL` (and, for the frontend, `VITE_DASHBOARD_URL`) values are
baked into these files **at build time**, from whatever `.env` was present
during `npm run build` — so build each app again if you change those values.

The backend runs in production exactly like in development, just with
`npm start` instead of `npm run dev` (no auto-restart-on-change) and real
production environment variables set on whatever host you deploy it to:

```
cd backend
npm start
```

## 14. Database seed data

Two optional scripts, run from `backend/`:

```
npm run seed        # creates default games, stations and prices, if none exist
npm run seed:demo   # also adds sample customers, bookings, and 30 days of
                     # session history, so every dashboard page has something
                     # to show
```

`npm run seed:demo` refuses to run if real session history already exists —
it's for a fresh database only, so it can never overwrite real business
data. Neither script touches staff accounts; that's what the dashboard's
first-run screen (Part 8) is for.

## 15. Hosting and deployment

You'll deploy four things: the database (already done, if you used Atlas),
the backend API, the public website, and the admin dashboard — as three
separate deployments, matching the three separate apps.

### Database hosting

If you used MongoDB Atlas in Part 6, nothing more to do here — it's already
hosted. Just make sure Network Access allows connections from your backend
host (Atlas's "Allow access from anywhere" is the simplest option; you can
tighten it once your backend has a fixed IP or IP range).

### Backend hosting — Render

[Render](https://render.com) has a genuine free tier for exactly this kind
of small Node API, deployed straight from your GitHub repository.

1. Push this project to a GitHub repository, if you haven't already.
2. Create a [render.com](https://render.com) account and connect your GitHub
   account.
3. **New** → **Web Service** → select your repository.
4. **Root Directory**: `backend` (important — this tells Render to only
   look inside the backend folder).
5. **Build Command**: `npm install`
6. **Start Command**: `npm start`
7. **Environment**: add each variable from `backend/.env` — `MONGO_URI`,
   `JWT_SECRET`, `CORS_ORIGINS` (leave `PORT` unset; Render sets its own,
   which `backend/src/config/env.js` already reads via `process.env.PORT`).
   For `CORS_ORIGINS`, use your *real* upcoming frontend and dashboard URLs
   from the next two sections — you can come back and update this once you
   know them.
8. **Create Web Service**, and wait for it to deploy.
9. Once live, copy its URL (something like
   `https://gamebreak-backend.onrender.com`) — you'll need it for the next
   two sections. Check it works: visit
   `https://your-backend-url.onrender.com/api/health` and you should see
   `{"ok":true,...}`.

**Free tier behaviour to expect:** Render's free web services spin down
after 15 minutes with no traffic, and take 30–50 seconds to wake back up on
the next request. That's normal — the first visitor after a quiet period
just waits a little longer.

### Frontend hosting (the public website)

Any static host works — Vercel, Netlify, GitHub Pages, or Render's own
static site hosting are all free and simple. The general steps (shown here
for Vercel, since it needs the least configuration for a Vite app):

1. [vercel.com](https://vercel.com) → **New Project** → import the same
   GitHub repository.
2. **Root Directory**: `frontend`.
3. Vercel detects Vite automatically (build command `npm run build`, output
   directory `dist`) — leave those as-is.
4. **Environment Variables**: add
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   VITE_DASHBOARD_URL=https://your-dashboard-url (fill in after the next part)
   ```
5. Deploy. You'll get a URL like `https://gamebreak.vercel.app`.

### Dashboard hosting (the admin app)

The same steps, again, as a **second, separate** Vercel project (or whatever
static host you chose) — this is a different application, so it gets its
own deployment:

1. **New Project** → same repository again.
2. **Root Directory**: `dashboard`.
3. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```
4. Deploy. You'll get a URL like `https://gamebreak-admin.vercel.app`.

### Tying it together

Once both frontends are deployed, go back to:
- The **backend's** `CORS_ORIGINS` environment variable on Render, and set
  it to your two real deployed URLs (comma-separated, no spaces), e.g.
  `https://gamebreak.vercel.app,https://gamebreak-admin.vercel.app`. Redeploy
  the backend for this to take effect.
- The **frontend's** `VITE_DASHBOARD_URL` on Vercel, set to your real
  deployed dashboard URL, then redeploy the frontend (Vite bakes env vars in
  at build time, so a redeploy is required for the change to show up).

## 16. Domain configuration

Once you're happy with the Vercel/Render URLs, you can point your own domain
at each piece. A common layout:

```
yourlounge.com          →  the frontend (public website)
admin.yourlounge.com    →  the dashboard
api.yourlounge.com      →  the backend
```

In Vercel/Render, each project has a **Domains** setting where you add your
custom domain and follow the DNS instructions shown (usually a `CNAME`
record). Once your domains are live, update the same three places as above
to use them instead of the `.vercel.app`/`.onrender.com` addresses:
`VITE_API_URL` (both frontend and dashboard), `VITE_DASHBOARD_URL`
(frontend), and `CORS_ORIGINS` (backend) — then redeploy each app that
changed.

## 17. CORS in production

`backend/src/config/env.js` reads `CORS_ORIGINS` as a comma-separated
allow-list and only ever accepts requests from those exact origins — the
code never falls back to `*`. When you add a custom domain or a new
deployment URL, add it to this list (comma-separated, no spaces) and
redeploy the backend; forgetting this step is the most common cause of
"the site loads but nothing works" after a new deployment (see
Troubleshooting, next).

## 18. Troubleshooting

**MongoDB connection error** (backend won't start, or logs a connection
error):
- Check `MONGO_URI` is copied correctly, with no leftover `<username>` or
  `<password>` placeholders.
- In Atlas, check the database user's password doesn't contain characters
  that need URL-encoding (e.g. `@` becomes `%40`) — or simplest, use a
  password without special characters.
- In Atlas → Network Access, check your current IP (or `0.0.0.0/0` for
  "anywhere") is allowed.
- Confirm the database user has read/write permissions in Atlas → Database
  Access.

**CORS error** in the browser console (something like "has been blocked by
CORS policy"):
- Check the backend's `CORS_ORIGINS` includes the *exact* URL the frontend
  or dashboard is actually running on (including `https://` and no trailing
  slash), and that you redeployed the backend after changing it.
- Check the frontend/dashboard's `VITE_API_URL` points at the right backend
  URL, and that you rebuilt/redeployed after changing it — Vite bakes this
  value in at build time, so editing `.env` alone does nothing to an
  already-built `dist/`.

**API not working / requests failing:**
- Confirm the backend is actually running — visit
  `<backend-url>/api/health` directly in a browser; it should return
  `{"ok":true,...}`.
- Open the browser's DevTools → Network tab, click the failing request, and
  read the actual response body — every error from this API is
  `{"error": "a plain-English reason"}`.
- Check the backend's own logs (in Render, under the service's Logs tab)
  for anything printed after the request.

**Admin login not working:**
- If nobody has ever completed the "create the first owner account" screen,
  do that first — there's no default password.
- Check you're using the email exactly as it was created with (emails are
  matched case-insensitively, but check for typos).
- Check `JWT_SECRET` is set (and identical) wherever the backend is running
  — if it changes, everyone's existing login token stops working and they
  simply need to sign in again.
- Confirm the dashboard's `VITE_API_URL` points at the right backend.

**Deployment build failure:**
- Run `npm install` and then `npm run build` locally, inside the specific
  app's folder (`frontend` or `dashboard`) that failed, and read the actual
  error — it's almost always the same error the host's build log shows,
  just easier to read locally.
- Check the host's **Root Directory** setting matches the folder
  (`frontend`, `dashboard`, or `backend`) — a very common mistake is
  pointing a static host at the repository root instead of the specific
  app's subfolder.

## 19. Testing

The backend has an automated test suite (`cd backend && npm test`) covering
authentication, the four-tier role system, the full session billing pipeline
(including the exact proration behaviour described in Part 1), booking
capacity checks, discount codes, inventory, events, staff management, and
the Excel export. These tests run against an in-memory stand-in for MongoDB
so they work offline with no setup — they are a development tool, not
something you need to run to use the app.

## 20. Roles, at a glance

Four staff roles, each including everything the one below it can do:

- **Staff** — run sessions (start/stop/bill), view and add customers.
- **Manager** — also bookings and the waiting list.
- **Admin** — also pricing, discounts, revenue, expenses, inventory, events,
  and settings.
- **Owner** — also managing staff accounts (adding, disabling, changing
  roles). This is the role the first-run account gets.

Every one of these is enforced by the backend itself on every request — the
dashboard simply hides menu items a role can't use, so nobody lands on a
page that's just a wall of "permission denied" errors, but hiding a link is
never the actual security boundary.

## 21. A note on scope

A few things are simplified on purpose, since this is built for a single
small gaming lounge rather than a chain:

- Password reset is done by an Owner typing a new one for someone on the
  Staff page — there's no "forgot password" email flow.
- The waiting list's "contact customer" step is a manual phone call, not an
  automated SMS/email.
- "Special event" pricing exists as a data field (`PricingPackage.dayType:
  'event'`) for future use, but nothing in this build switches it on
  automatically for a date range yet — weekday/weekend pricing is what's
  live today.
