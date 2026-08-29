# Baseline migration

The original repository contains loose migration SQL files at the repository
root. They must not be blindly renamed or concatenated.

Before production deployment, create a real Prisma migration history from the
current canonical schema using the project's actual database state.

For an existing database whose schema already matches the canonical schema,
use Prisma's baseline workflow rather than replaying destructive migrations.

Do not run `prisma migrate reset` against a real database.
