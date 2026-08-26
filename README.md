# MedBridge
Production-oriented medication continuity MVP for India.

## Architecture
- Backend: Node.js 22 + Express 5 + Prisma 6 + PostgreSQL
- Mobile: Expo SDK 53 + React Native 0.79
- Auth: JWT session records with revocation
- Security: Helmet, strict CORS, rate limiting, Zod validation, bcrypt
- Data: medicines, requests, pharmacy inventory, reservations, notifications, push tokens, audit logs

## Local backend
1. `cd backend`
2. `npm install`
3. `cp .env.example .env` and set `JWT_SECRET`
4. Start PostgreSQL: `docker compose up -d db`
5. `npx prisma migrate dev --name init`
6. `npx prisma migrate deploy`
7. `npm run seed`
8. `npm run dev`

API: `http://localhost:4000`
Health: `/health`, readiness: `/ready`

## Demo accounts
Patient `9999999999` / `demo1234`
Pharmacy `8888888888` / `demo1234`
Admin `7777777777` / `demo1234`

## Production checklist
- Use managed PostgreSQL and backups.
- Generate a random JWT secret of at least 32 characters (prefer 64+ cryptographically random characters).
- Set a strict HTTPS CORS origin.
- Configure a real Expo/EAS project ID and access token if push notifications are required; do not ship placeholder values.
- Put the API behind TLS/reverse proxy and a WAF/load balancer.
- Rotate secrets and enable database monitoring.
- Review Indian privacy, consent, retention, security, and healthcare requirements with qualified counsel before launch.

## Docker deployment
1. Copy `.env.example` to `.env` and set strong `POSTGRES_PASSWORD` and `JWT_SECRET`.
2. Run `docker compose --env-file .env up -d --build`.
3. Check `GET /health` and `GET /ready`.
4. Put the API behind HTTPS/reverse proxy before public traffic.

## Mobile production build
1. In `mobile/.env`, set `EXPO_PUBLIC_API_URL` to the public HTTPS API and `EXPO_PUBLIC_EAS_PROJECT_ID` to the real EAS project ID.
2. Run `npm install` in `mobile`.
3. Authenticate with EAS CLI.
4. Run `npm run build:android` and/or `npm run build:ios`.

## Important deployment notes
- Do not use the demo credentials in production.
- Do not commit `.env` files or secrets.
- For horizontally scaled API instances, replace the in-memory rate-limit store with a shared store such as Redis.
- Configure database backups, TLS, monitoring, log aggregation, and secret rotation before launch.

## Debugged refill behavior
- Customer's existing medicine stock is never reduced when creating a refill request or reservation.
- Pharmacy inventory is reduced when the reservation is created.
- Pharmacy inventory is restored if the reservation is cancelled or expires.
- Patient medicine stock is increased only when the pharmacy marks the reservation as picked up.
- The mobile refill action stays simple: it prepares a refill request using the medicine's configured quantity and current location.

## UI direction
The mobile interface keeps the same feature set and navigation, but uses a calm eco-friendly visual system: soft natural background, green active states, high-contrast text, simple cards, and no additional complexity.

## Competition scope
This student submission intentionally uses RevenueCat-powered mobile in-app purchases as the single monetization integration. Web checkout and RevenueCat Ads are excluded to keep the product focused. Delivery is also excluded. Pharmacies remain free during the hackathon MVP.

## RevenueCat
Entitlement: `consumer_premium`. Configure monthly ₹149 and annual ₹1,499 store products, with the 3-day trial configured in the stores/RevenueCat dashboard.
