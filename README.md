# JOE Advanced Engine (Infinity-x-platform)

**JOE** (Job Orchestration Engine) is a powerful, multi-agent, self-evolving platform designed to automate complex software development and deployment tasks. It is the core system powering xelitesolutions.com.

## Architecture Overview

The system is composed of several interconnected services:

1.  **Backend (`backend/`)**: A Node.js/Express server that handles API requests, authentication, and core logic.
    *   **Framework**: Express.js
    *   **Database**: MongoDB (via Mongoose)
    *   **Evolution Core**: Contains the self-evolution logic (`runtime-evolution.service.mjs`) and the multi-agent system (`agent-team.service.mjs`).
2.  **Frontend (`public-site/`)**: The static website and login portal, designed for deployment on platforms like Cloudflare Pages.
    *   **Technologies**: HTML, CSS, Vanilla JavaScript.
3.  **Dashboard (`dashboard-x/`)**: The main user interface for the JOE engine (currently a placeholder).
4.  **Worker (`worker/`)**: A dedicated service for long-running, asynchronous tasks.

## Development Status

This repository is under active development and refactoring to fully integrate the multi-agent system and self-evolution capabilities.

### Recent Updates (Phase 1 Refactoring)

*   **Authentication Flow**: Implemented a functional login API endpoint and updated the frontend login form to communicate with the backend.
*   **Password Visibility**: Added a "Show/Hide Password" feature to the login page for improved user experience.
*   **Agent System Refactoring**: Consolidated the multi-agent planning and execution logic into a single, unified service (`agent-team.service.mjs`) to eliminate redundant code.
*   **Code Cleanup**: Removed unused dependencies (`prom-client`, `depcheck`, `shell-escape`) from the main `package.json`.

## Setup and Deployment

**Note**: This project is designed for deployment on Render (Backend) and Cloudflare Pages (Frontend).

### Backend Setup

1.  **Dependencies**: `cd backend && npm install`
2.  **Environment**: Create a `.env` file in the `backend/` directory with your configuration (e.g., `MONGO_URI`, `OPENAI_API_KEY`).
3.  **Run**: `node backend/server.mjs`

### Production CORS Configuration

- Set `CORS_ORIGINS` to include your public domains, for example:
  - `CORS_ORIGINS="https://xelitesolutions.com, https://www.xelitesolutions.com"`
- Ensure your proxy/CDN allows `OPTIONS` requests to pass through to the backend.
- If using Cloudflare, deploy the worker at `infra/cloudflare/cors-worker.js` and route it for `api.xelitesolutions.com` to guarantee preflight responses (OPTIONS) with status `200` and mirrored `Origin`.

### Admin Credentials Seeding

- Set the following environment variables on production to seed/update a super admin account at startup:
  - `SUPER_ADMIN_EMAIL=<admin@example.com>`
  - `SUPER_ADMIN_PASSWORD=<strong-password>`

### Preflight Verification (Recommended)

- Verify CORS preflight after deployment:
  - `curl -i -X OPTIONS 'https://api.xelitesolutions.com/api/v1/auth/login' \
    -H 'Origin: https://www.xelitesolutions.com' \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type'`
  - Expect `HTTP/2 200` and headers: `Access-Control-Allow-Origin` equal to the `Origin`, `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Headers` containing `content-type`.

### WAF/Proxy Fallback

- If a WAF/Proxy still returns non-2xx for `OPTIONS`, add an allow rule for `OPTIONS` to `/api/v1/auth/login`, or front the API with the Cloudflare worker to enforce consistent CORS.

### Frontend Setup

1.  **Dependencies**: `cd public-site && npm install` (if needed)
2.  **Run**: Serve the static files (e.g., using `http-server public-site -p 8080`).

### Supabase Migrations

- Supabase auth schema is defined in `supabase/migrations/001_create_auth_schema.sql`.
- Supabase RLS and auth functions are defined in `supabase/migrations/002_create_rls_policies.sql`.

## Contribution

Contributions are welcome! Please follow the existing code style and submit pull requests for review.
