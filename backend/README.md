# ArtVis Backend

This directory contains the Node.js backend for the ArtVis project, providing a GraphQL API (Apollo Server) connected to a Neo4j database.

## Structure

- `index.js` — Main entry point, loads environment variables, starts the server
- `schema.js` — GraphQL schema definitions
- `cypherRouting.js` — Custom Cypher query routes
- `introspect/` — Tools for schema introspection
- `.env`, `.env.dev`, `.env.template`, `.env.dev.template` — Environment variable files
- `Dockerfile` — Docker build instructions for backend
- `package.json` — NPM dependencies and scripts

## Scripts

Run with `npm run <script>`:

| Script   | Description                                 |
|----------|---------------------------------------------|
| start    | Start server with `.env` (production)        |
| dev      | Start server with `.env.dev` (development)   |

## Environment Configuration

- Copy `.env.template` to `.env` for production, or `.env.dev.template` to `.env.dev` for development.
- Set Neo4j connection variables: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`.

## Dockerfile

- Uses Node 18 base image
- Installs dependencies and runs the server
- Exposes port 4000

## Docker Compose

- See project root `docker-compose.yml` for multi-container setup
- Backend service: `artvis-backend` (port 4000)
- Mounts backend code and node_modules as volumes

---
See the main project README for more details.
