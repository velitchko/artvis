# ArtVis Frontend

This directory contains the React/TypeScript frontend for the ArtVis project.

## Structure

- `src/` — Main source code (components, pages, models, queries, utils, etc.)
- `environments/` — Environment config files for dev/prod
- `Dockerfile` — Docker build instructions for frontend
- `package.json` — NPM dependencies and scripts
- `index.html` — Main HTML template
- `tailwind.config.cjs`, `postcss.config.cjs` — Styling config

## Scripts

Run with `npm run <script>`:

| Script      | Description                                 |
|-------------|---------------------------------------------|
| dev         | Start dev server (uses environment.dev.ts)   |
| prod        | Start prod server (uses environment.prod.ts) |
| build:dev   | Build for development                       |
| build:prod  | Build for production                        |
| deploy      | Build and start in production mode           |

## Environment Configuration

- Edit files in `environments/` to set API endpoints for dev/prod
- Webpack config swaps in the correct environment file based on build mode

## Dockerfile

- Uses Node 18 base image
- Installs dependencies and builds the app
- Exposes port 4200

## Docker Compose

- See project root `docker-compose.yml` for multi-container setup
- Frontend service: `artvis-frontend` (port 4200)
- Mounts frontend code and node_modules as volumes

---
See the main project README for more details.
