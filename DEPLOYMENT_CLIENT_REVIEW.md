# Client Review Deployment Guide

This is the fastest stable setup:

- Frontend: **Vercel**
- Backend API: **Railway** (Docker deployment)
- Database: **Railway MySQL**

## 1. Push Code to GitHub

If this project is not in a git repo yet, initialize and push it first.

## 2. Deploy Database + API on Railway

1. Create a new Railway project.
2. Add **MySQL** service from Railway marketplace.
3. Add a new service from your repo, root directory `backend`.
4. Railway will detect `backend/Dockerfile` and build the API.
5. Set backend environment variables in Railway:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `DATABASE_HOST=<railway mysql host>`
   - `DATABASE_PORT=<railway mysql port>`
   - `DATABASE_USER=<railway mysql user>`
   - `DATABASE_PASSWORD=<railway mysql password>`
   - `DATABASE_NAME=<railway mysql database>`
   - `JWT_SECRET=<long-random-secret>`
   - `JWT_EXPIRATION=7d`
   - `CORS_ORIGIN=<your-vercel-url>`
6. Deploy backend service.
7. Copy API public URL, example:
   - `https://jewelry-api-production.up.railway.app`

## 3. Load Database Schema

Run against Railway MySQL:

```bash
mysql -h <host> -P <port> -u <user> -p <database> < DATABASE_SCHEMA_PROFESSIONAL.sql
```

If DB already existed from old version, also run:

```bash
mysql -h <host> -P <port> -u <user> -p <database> < DATABASE_USER_MANAGEMENT_UPGRADE.sql
```

## 4. Deploy Frontend on Vercel

1. Import repo into Vercel.
2. Set project root directory to `frontend`.
3. Add env var:
   - `VITE_API_URL=https://<your-railway-api-domain>/api`
4. Deploy.

`frontend/vercel.json` already includes SPA rewrites for React Router.

## 5. Post-Deploy Smoke Test

1. Open frontend URL.
2. Login with seeded super admin:
   - `admin@jewelryplatform.com`
   - `Admin@123`
3. Verify:
   - Companies page loads.
   - Branches page loads.
   - Users page loads, create/edit user works.
   - Role + task permissions persist correctly.

## 6. Optional Hardening Before Client Demo

- Set a stronger `JWT_SECRET`.
- Restrict `CORS_ORIGIN` to exact Vercel domain.
- Disable public indexing via Vercel project settings if needed.
