# MedBridge GitHub Fix Plan

This pack is intentionally separated from the original repository because the
connected GitHub integration did not expose repository write access/export in
this session.

Confirmed fixes to apply:

1. Normalize the repository around the actual root-level `server.ts` and
   `App.tsx` layout.
2. Remove stale `backend/` and `mobile/src/` deployment/documentation paths.
3. Add `.gitignore` and a complete `.env.example`.
4. Make Docker build from the repository root.
5. Use a real Prisma migration directory.
6. Add separate backend/mobile TypeScript checks.
7. Replace destructive demo seeding with idempotent/upsert-style seeding.
8. Fix RevenueCat webhook authentication to match the configured webhook
   Authorization/signature mechanism.
9. Audit Premium feature exposure so documented features match mobile UI.
10. Keep production secrets out of source control.
11. Add CI that validates backend TypeScript, mobile TypeScript, Prisma
    generation/schema validation, and repository layout.
12. Re-run the Android/proot diagnosis only after the repository itself is
    internally consistent.

IMPORTANT:
The existing source files must be preserved when applying this pack. This
pack does not invent or replace the business logic in `server.ts`, `App.tsx`,
or `schema.prisma`.
