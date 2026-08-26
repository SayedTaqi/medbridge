# MedBridge

Production-oriented medication continuity MVP for India.

## Repository layout

This competition build intentionally uses one root workspace:
- **API:** `server.ts`, Prisma schema, seed and API tests
- **Mobile:** `App.tsx`, Expo configuration and RevenueCat integration
- **Database:** `schema.prisma`
- **Deployment:** `Dockerfile` and `docker-compose.yml`

## Judge setup

1. Install Node.js 22+.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` and a JWT secret of at least 32 characters.
4. Start PostgreSQL with `docker compose up -d db`.
5. Validate and generate Prisma:
   - `npm run prisma:validate`
   - `npm run prisma:generate`
6. Create/update the database with `npm run db:push`.
7. Seed demo accounts with `npm run seed`.
8. Start the API with `npm run api:dev`.
9. In a second terminal, start Expo with `npm run mobile:start`.
10. For real Premium purchases, set the public RevenueCat SDK keys and configure the `consumer_premium` entitlement in RevenueCat.

## Demo accounts

- Patient: `9999999999` / `demo1234`
- Pharmacy: `8888888888` / `demo1234`
- Admin: `7777777777` / `demo1234`

## Competition monetization

RevenueCat is the single monetization integration:
- Entitlement: `consumer_premium`
- Monthly: ₹149
- Annual: ₹1,499
- Trial: 3 days, configured in the stores/RevenueCat dashboard

No production secrets are included.
