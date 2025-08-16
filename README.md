# Water Purifier API — Vercel + Neon (Postgres) with Admin Auth

This project is Vercel-ready and backed by Neon (Postgres). It exposes REST endpoints used by the water purifier frontend with admin JWT authentication for protected CRUD routes.

## Features
- Public endpoints: products, categories, deals, testimonials, faqs
- Protected admin endpoints (JWT): create/update/delete products, categories, deals, faqs, testimonials, enquiries
- Admin seeded by `scripts/seed.js` (email + password from .env.example)
- Neon/Postgres via `pg` Pool (SSL-enabled)
- Vercel serverless compatible (api/index.js)

## Quick Local Setup
1. Copy `.env.example` to `.env` and set `DATABASE_URL` & `JWT_SECRET`.
   - On Windows: `copy .env.example .env`
2. Install dependencies: `npm install`
3. Create schema: `npm run schema`
4. Seed sample data and an admin user: `npm run seed`
5. Run locally with Vercel dev: `npm run dev` (requires Vercel CLI).

## Admin Login
- POST `/api/auth/login` with JSON `{ "email": "...", "password": "..." }`
- Response: `{ token: "..." }`

## Using protected routes
- Provide header: `Authorization: Bearer <token>`

## Deploy to Vercel
1. `vercel login`
2. `vercel link` (link or create project)
3. Add `DATABASE_URL` and `JWT_SECRET` in Vercel dashboard or run `vercel env add DATABASE_URL` and `vercel env add JWT_SECRET`
4. `vercel --prod`