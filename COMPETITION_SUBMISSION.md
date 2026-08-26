# MedBridge — Competition Submission Notes

## Student competition scope
MedBridge is submitted as a source-code project with a short demo video. The project intentionally keeps one clear monetization path: **RevenueCat-powered mobile in-app purchases** for Consumer Premium.

### RevenueCat
- SDK: `react-native-purchases` + `react-native-purchases-ui`
- Entitlement: `consumer_premium`
- Consumer plans: ₹149/month and ₹1,499/year
- Trial: 3 days, configured in the App Store / Google Play products and RevenueCat dashboard
- Purchase, restore, entitlement check, and Customer Center are implemented in `mobile/src/revenuecat.ts`

### Intentionally excluded
- Web checkout
- RevenueCat Ads
- Delivery logistics
- Pharmacy payment during the hackathon MVP

## Approved product scope
### Consumer Premium
1. Unlimited family members
2. Unlimited medicines
3. Caregiver sharing
4. Automatic refill preparation
5. Multiple pharmacies
6. Refill history
7. Advanced reminders
8. Priority refill request
9. Travel Mode

### Pharmacy
1. Unlimited refill requests
2. Recurring customer relationship
3. Pharmacy discovery
4. Refill demand forecasting
5. Customer retention analytics

Pharmacies remain free during the hackathon MVP.

## Integrations
- MSG91 SMS adapter
- Resend email adapter
- Google Maps adapter
- AWS S3 private file storage adapter
- PostgreSQL + Prisma
- Android + iOS Expo application
- Admin/RBAC backend

## Judge setup
1. Clone this repository.
2. Read `README.md`.
3. Start PostgreSQL.
4. Run backend migrations and seed.
5. Start the API.
6. Start the Expo mobile project.
7. Add RevenueCat public SDK keys to `mobile/.env` when testing purchases.
8. Configure the `consumer_premium` entitlement and monthly/annual products in RevenueCat.

No production secrets are included in this repository.
