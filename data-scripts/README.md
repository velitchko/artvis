# Data Scripts for ArtVis

This folder contains scripts for data import and maintenance for the ArtVis project.

## Available Scripts

| Script Name                        | Description                                                      |
|------------------------------------|------------------------------------------------------------------|
| rebuild_coexhibited_relationships.py | Rebuilds CO_EXHIBITED and CO_EXHIBITED_TOTAL relationships in Neo4j |

## Script: rebuild_coexhibited_relationships.py

This script processes exhibitions in batches to create or update relationships between artists who exhibited together.

### Usage

```sh
python rebuild_coexhibited_relationships.py [flags]
```

### Available Flags

| Flag                | Type    | Default         | Description                                                                 |
|---------------------|---------|-----------------|-----------------------------------------------------------------------------|
| --skip-clear        | bool    | false           | Skip deleting all existing CO_EXHIBITED and CO_EXHIBITED_TOTAL relationships |
| --only-total        | bool    | false           | Only calculate CO_EXHIBITED_TOTAL relationships                             |
| --only-coexhibited  | bool    | false           | Only rebuild CO_EXHIBITED relationships                                     |
| --batch-size        | int     | 50 (env BATCH_SIZE) | Batch size for processing exhibitions                                   |

### Environment Variables

- `NEO4J_URI` (default: bolt://localhost:7687)
- `NEO4J_USER` (default: neo4j)
- `NEO4J_PASSWORD` (default: admin123)
- `BATCH_SIZE` (default: 50)

See `.env.example` for a template.

---
Add more scripts and update this README as needed.
