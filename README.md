# Nuxt Notes SPA

Test assignment: a notes SPA with todo lists, built with `Nuxt 4`, `Pinia`, and `Composition API`.

## Implemented scope

- 2 pages:
  - `/` notes list with compact read-only todo preview
  - `/notes/[id]` create/edit note page
- Note actions:
  - create
  - edit
  - delete with modal confirmation
  - cancel editing with modal confirmation
- Todo actions:
  - add
  - delete
  - edit text
  - mark as done
- State persistence after reload (`localStorage` + Pinia hydration)
- Reusable UI components: `BaseButton`, `BaseInput`, `BaseCheckbox`, `BaseModal`
- Responsive layout with SCSS
- No browser alerts, confirmations only via modals

## Requirements

- Docker + Docker Compose
- Optional for local dev without Docker: Node.js 20+

## Run with Docker Compose

First run (or after Dockerfile/dependency changes):

```bash
docker-compose up --build
```

Regular run:

```bash
docker-compose up
```

App URL: `http://localhost:3000`

## Run locally without Docker (optional)

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run typecheck
npm run check
```

`npm run check` runs the full gate: typecheck + production build.
