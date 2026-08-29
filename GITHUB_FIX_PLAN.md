# MedBridge — 10-section fix checklist

1. Repository layout/documentation: standardize root-level server.ts, App.tsx, src/, android/, and prisma/ references; remove stale backend/ and mobile/src/ paths.
2. Docker deployment: build from repository root and start dist/server.js after Prisma preparation.
3. Prisma migrations: use ordered prisma/migrations/<timestamp>_<name>/ structure; baseline existing databases safely.
4. .gitignore: exclude secrets, dependencies, build artifacts, Gradle/iOS output and local IDE configuration.
5. .env.example: document database/JWT, integrations, RevenueCat webhook and Expo variables.
6. Seed safety: remove unconditional destructive deleteMany/reset behavior from normal seeding.
7. Mobile TypeScript: run a dedicated mobile tsc check in CI.
8. RevenueCat webhook authentication: support the configured Authorization header and documented signature mechanism without exposing secrets.
9. Premium feature consistency: keep mobile UI, API and documentation synchronized.
10. Android/iOS production: never use debug signing for release; keep production credentials outside source control.

Verification:
- npm ci
- npx prisma validate
- npx prisma generate
- npm run build
- npx tsc -p tsconfig.mobile.json --noEmit
- bash scripts/audit-repo.sh

This is a patch/configuration pack, not the original full source repository.
