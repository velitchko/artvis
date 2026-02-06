# ArtVis Project

ArtVis is a full-stack application for visualizing art exhibition data. This project consists of a backend (Node.js/Express/Neo4j), a frontend (React/TypeScript), and data scripts for setup and maintenance.

## Directory Structure

```
artvis/
├── backend/           # Node.js backend (Apollo GraphQL, Neo4j)
│   ├── index.js
│   ├── schema.js
│   ├── cypherRouting.js
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.template
│   ├── .env.dev.template
│   └── ...
├── frontend/          # React frontend (TypeScript, Tailwind)
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── ...
├── data-scripts/      # Python scripts for data import/maintenance
│   ├── rebuild_coexhibited_relationships.py
│   ├── requirements.txt
│   └── .env.example
├── docker-compose.yml # Multi-container orchestration
└── ...
```

## Backend Configuration

1. **Environment Variables:**
   - Copy `.env.template` to `.env` for production or to `.env.dev` for development.
   - Fill in your Neo4j connection details:
     ```
     NEO4J_URI=bolt://localhost:7687
     NEO4J_USER=your-username
     NEO4J_PASSWORD=your-password
     ```
2. **Install dependencies:**
   ```sh
   cd backend
   npm install
   ```
3. **Run locally:**
   - Development: `npm run dev` (loads `.env.dev`)
   - Production: `npm run start` (loads `.env`)

## Frontend Configuration

1. **Environment:**
   - Edit files in `frontend/environments/` as needed for API endpoints.
2. **Install dependencies:**
   ```sh
   cd frontend
   npm install
   ```
3. **Run locally:**
   ```sh
   npm run dev
   ```

## Data Scripts

- Python scripts for data import/maintenance are in `data-scripts/`.
- Configure with `.env.example` as a template.
- Setup a virtual python environment:
  ```sh
  python -m venv .venv
  source ./venv/bin/activate # for *nix & macos systems
  .\.venv\Scripts\activate.ps1 # for Windows Powershell
  ```
- Install dependencies:
  ```sh
  cd data-scripts
  pip install -r requirements.txt
  ```

> See README.md in `data-scripts` folder for further details.

## Docker & Deployment

- Use `docker-compose.yml` to run backend and frontend containers together:
  ```sh
  docker-compose up --build
  ```
- Backend and frontend Dockerfiles are in their respective folders.
- Ensure your Neo4j database is accessible to the backend container.

## Notes
- For development, use `.env.dev` and `npm run dev` in backend.
- For deployment, use `.env` and `npm start` or Docker Compose.
- Update environment files and Docker Compose as needed for your infrastructure.
