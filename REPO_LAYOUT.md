# Canonical MedBridge repository layout

The canonical layout should be:

- `server.ts` — backend entry point
- `App.tsx` — Expo application entry point
- `src/` — mobile support modules
- `schema.prisma` or `prisma/schema.prisma` — choose one and reference it
  consistently; this fix pack standardizes on `prisma/schema.prisma`
- `prisma/migrations/` — ordered Prisma migrations
- `seed.ts` — safe demo seed
- `maps.ts`, `messaging.ts`, `notifications.ts`, `storage.ts` — backend
  integrations
- `android/` — native Android project
- `.github/workflows/` — CI
- `docs/` — deployment/audit documentation

No deployment file should reference a non-existent `backend/` directory or
`src/server.ts` unless that structure is actually introduced everywhere.
