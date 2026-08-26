# MedBridge API
Base URL: `/`

Auth: `Authorization: Bearer <session-token>`

## Auth
POST `/auth/register`
POST `/auth/login`
POST `/auth/logout`
POST `/auth/change-password`
GET `/me`
PATCH `/me`

## Patient
GET/POST/PATCH/DELETE `/medicines`
POST `/requests`
GET `/requests`
GET `/requests/:id`
POST `/requests/:id/cancel`
GET `/pharmacies/nearby`
POST `/reservations`
GET `/reservations`
POST `/reservations/:id/cancel`
POST `/reservations/:id/pickup`
GET `/notifications`
POST `/notifications/:id/read`
POST `/notifications/read-all`
POST `/push-tokens`

## Pharmacy
GET/PATCH `/pharmacy/profile`
GET/POST/DELETE `/pharmacy/inventory`
GET `/pharmacy/requests`
POST `/pharmacy/requests/:id/respond`
GET `/pharmacy/reservations`
POST `/reservations/:id/pickup`

## Admin
GET `/admin/stats`
GET `/admin/pharmacies`
PATCH `/admin/pharmacies/:id/verify`
GET `/admin/users`
PATCH `/admin/users/:id/status`
GET `/admin/audit-logs`

## Refill semantics
A refill request adds stock to the patient's medicine only after pharmacy pickup. Creating a request or reservation never consumes the patient's existing medicine stock.

## Operational
GET `/health`
GET `/ready`