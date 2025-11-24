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

### Frontend Setup

1.  **Dependencies**: `cd public-site && npm install` (if needed)
2.  **Run**: Serve the static files (e.g., using `http-server public-site -p 8080`).

## Contribution

Contributions are welcome! Please follow the existing code style and submit pull requests for review.
