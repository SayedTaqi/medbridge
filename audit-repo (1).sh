#!/usr/bin/env bash
set -u

echo "== MedBridge repository audit =="

required=(
  "package.json"
  "server.ts"
  "schema.prisma"
  "App.tsx"
  ".env.example"
  ".gitignore"
  "Dockerfile"
  "docker-compose.yml"
)

for f in "${required[@]}"; do
  if [ -e "$f" ]; then
    printf 'OK   %s\n' "$f"
  else
    printf 'MISS %s\n' "$f"
  fi
done

echo
echo "== Broken legacy path references =="
grep -RIn --exclude-dir=node_modules --exclude-dir=.git \
  -E 'backend/|mobile/src/|src/server\.ts|prisma/schema\.prisma' \
  README.md SOURCE_MANIFEST.txt COMPETITION_SUBMISSION.md Dockerfile docker-compose.yml 2>/dev/null || true

echo
echo "== Dangerous seed operations =="
grep -RIn --exclude-dir=node_modules --exclude-dir=.git \
  -E 'deleteMany\(\)|TRUNCATE|DROP TABLE' seed.ts prisma 2>/dev/null || true

echo
echo "== Environment references =="
grep -Rho --exclude-dir=node_modules --exclude-dir=.git \
  -E 'process\.env\.[A-Z0-9_]+' server.ts maps.ts messaging.ts notifications.ts storage.ts 2>/dev/null \
  | sort -u || true

echo
echo "== Prisma migration layout =="
find prisma -maxdepth 3 -type f 2>/dev/null | sort || true
