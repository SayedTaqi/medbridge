#!/usr/bin/env bash
set -u
fail=0
check(){ [ -e "$1" ] && echo "OK   $1" || { echo "MISS $1"; fail=1; }; }

for f in package.json server.ts App.tsx .gitignore .env.example Dockerfile docker-compose.yml tsconfig.mobile.json; do check "$f"; done

grep -q 'build: \.' docker-compose.yml 2>/dev/null || { echo "FAIL docker build context"; fail=1; }
grep -q 'node dist/server.js' Dockerfile 2>/dev/null || { echo "FAIL Docker entrypoint"; fail=1; }
[ -d prisma/migrations ] || { echo "FAIL prisma/migrations missing"; fail=1; }
grep -q '^\.env$' .gitignore 2>/dev/null || { echo "FAIL .env ignore"; fail=1; }
grep -q '^node_modules/' .gitignore 2>/dev/null || { echo "FAIL node_modules ignore"; fail=1; }

for key in DATABASE_URL JWT_SECRET EXPO_PUBLIC_API_URL; do
  grep -q "^${key}=" .env.example 2>/dev/null || { echo "FAIL env key $key"; fail=1; }
done

if [ -f seed.ts ] && grep -Eq 'deleteMany\(\)|TRUNCATE|DROP TABLE' seed.ts; then
  echo "FAIL destructive seed operation detected"; fail=1
fi

if [ -f android/app/build.gradle ] && grep -q 'signingConfig signingConfigs.debug' android/app/build.gradle; then
  echo "FAIL Android release uses debug signing"; fail=1
fi

if [ "$fail" -eq 0 ]; then echo "PASS: 10-section fix checks"; else echo "FAIL: review required"; fi
exit "$fail"
