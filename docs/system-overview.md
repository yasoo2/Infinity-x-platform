# Infinity-X Platform Overview and Quick Test Guide

This document summarizes the major services in the Infinity-X/JOE platform and outlines practical commands to validate each area during local exploration.

## Repository Structure
- **Backend (`backend/`)** – Node.js/Express core that hosts APIs, AI orchestration, and database integrations; entry point `backend/server.mjs` with CORS/security middleware and websocket subsystems.
- **Dashboard (`dashboard-x/`)** – React + Vite SPA for the primary user experience (`dashboard-x/index.html` entry with `src/App.jsx` and `src/pages/Joe.jsx`).
- **Public Site (`public-site/`)** – Static marketing/login site served as plain HTML/CSS/JS via `public-site/index.html`.
- **Workers (`worker/`)** – Background executors for heavy jobs; default start script runs `worker-enhanced.mjs`.
- **Cloudflare Worker (`cloudflare-worker/`)** – Edge worker utilities (e.g., CORS helper) used when fronting the backend.
- **Docs/Infra (`docs/`, `infra/`)** – Deployment references and infrastructure helpers.

## Backend Notes and Checks
- Install dependencies once with `cd backend && npm install` (required for Jest, linting, and runtime scripts).
- Core server boot: `npm start` uses `server.mjs`, which initializes Mongo connections, super-admin seeding, planners, schedulers, and websocket servers.
- Security middleware includes Helmet, rate limiting, XSS/mongo sanitizers, and custom CORS whitelist logic.
- Quick health commands:
  - `npm run lint` – ESLint across backend code (ignores the refactor-excluded code-review service).
  - `npm test` or scoped variants (`npm run test:unit`, `npm run test:integration`) – Jest suites when environment (e.g., Mongo) is available.
  - `npm run demo` – Runs example interaction from `examples/demo.js` after dependencies exist.

## Dashboard-X (React SPA)
- Install with `cd dashboard-x && pnpm install` (package manager pinned to `pnpm@10.20.0`).
- Development server: `pnpm dev` (Vite), preview with `pnpm preview`, production build via `pnpm build`.
- Linting: `pnpm lint` to check `src/**/*.{js,jsx,ts,tsx}`.

## Public Site
- Static files in `public-site/index.html`, `assets/`, and `login/`; no build pipeline required.
- Placeholder npm script `npm start` simply echoes that this is a marketing site—serve via any static file server (e.g., `npx http-server public-site -p 8080`).

## Worker Service
- Install dependencies in `worker/` if running jobs locally: `cd worker && npm install`.
- Start the enhanced worker with `npm start` (runs `worker-enhanced.mjs`); use `npm run dev` for watch mode.

## Testing Tips
- Prefer running linters first to validate code style without external services.
- For tests needing MongoDB/Redis, configure `.env` in `backend/` (see `env.example`) before running Jest suites.
- When exploring CORS or preflight behavior, backend logs the computed whitelist on startup for visibility.
