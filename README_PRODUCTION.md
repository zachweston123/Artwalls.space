# Artwalls Marketplace Web App (Production Starter)

This repo started as a Figma export and has been upgraded into a **real, end-to-end marketplace starter**:

- **Frontend:** Vite + React + Tailwind + Radix UI
- **Backend:** Node/Express + Stripe (Checkout + Connect)

## What’s productionized

- **Dark mode now works reliably** (Tailwind `dark:` is applied consistently).
- **Stripe Connect (multi-vendor payouts)**
  - Artists complete Stripe-hosted onboarding (Express)
  - Payouts happen automatically to the artist’s bank account once enabled
- **Automated listing monetization**
  - When an artist adds an artwork, the server creates a **Stripe Product + Price** automatically
  - The purchase page creates a **Checkout Session** that routes funds to the artist (destination charge)
- **Webhooks**
  - `checkout.session.completed` marks the artwork as sold (replace the JSON store with a real DB for launch)

> Note: This starter uses a simple JSON file for server persistence so you can run locally quickly. For a real launch, connect a database (Postgres/Supabase, etc.).

## Run locally

### 1) Frontend

```bash
npm install
cp .env.example .env
npm run dev
```

Vite dev server runs on `http://localhost:3000`.

### 2) Backend (Stripe + Connect)

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Server runs on `http://localhost:4242`.

## End-to-end flow

1) Sign in as an **Artist** (demo auth)
2) In **Dashboard → Get paid automatically**, click **Set up payouts**
3) After onboarding completes, go to **My Artworks** and create a listing
4) Open the purchase page (`#/purchase-<id>`) and click **Buy This Artwork**
5) Webhook marks the artwork sold

## Important launch upgrades (recommended)

- Replace demo auth with a real auth provider (Clerk/Auth0/Supabase Auth)
- Replace JSON store with Postgres + migrations
- Add image uploads (S3/Supabase Storage/Cloudinary)
- Add real order confirmation + emails
- Add anti-fraud, rate limits, and idempotency
