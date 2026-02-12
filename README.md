# Nuxt Notes SPA

Single-page application for notes with todo lists, built with Nuxt 4 + Pinia + Composition API.

## Implemented requirements

- 2 pages:
  - `/` list of notes with compact readonly todos preview
  - `/notes/[id]` create/edit note with full todo editing
- Actions on notes:
  - create
  - edit
  - delete with modal confirmation
  - cancel editing with modal confirmation
- Actions on todo items:
  - add
  - delete
  - edit text
  - mark as done
- Undo/redo in editor:
  - buttons
  - keyboard shortcuts `Ctrl+Z` and `Ctrl+Shift+Z` (or `Cmd+Z` / `Cmd+Shift+Z`)
- State persistence after reload via localStorage + Pinia store hydration
- Reusable UI components (`BaseButton`, `BaseInput`, `BaseCheckbox`, `BaseModal`)
- Responsive layout and SCSS styling
- No browser alerts, confirmations only through modal windows

## Local run

```bash
npm install
npm run dev
```

App is available at `http://localhost:3000`.

## Docker run

```bash
docker-compose up --build
```

App is available at `http://localhost:3000`.

## Production preview without Docker

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 3000
```
