# 🚚 Courier & Logistics Management Platform

A scalable backend system for managing courier operations, shipment lifecycle, payments, courier assignments, hub transfers, and delivery tracking.

Built with **Node.js, TypeScript, Express.js, PostgreSQL, Prisma ORM, Redis, Stripe, and Google OAuth**.

---

# 📌 Business Problem

Traditional courier businesses often manage shipment operations manually or through disconnected systems. This creates several operational challenges:

## 1. Lack of Real-Time Shipment Visibility

Customers cannot easily track:

- Current shipment location
- Delivery status
- Courier progress
- Hub movement history


## 2. Manual Courier Assignment

Operations teams manually assign couriers, which causes:

- Slow pickup response
- Uneven workload distribution
- Human errors


## 3. Payment Verification Issues

Many systems rely on:

- Manual payment confirmation
- Screenshots
- Admin approval

This creates security risks and delays.


## 4. Complex Shipment Lifecycle Management

A parcel goes through multiple stages:
Created
 ↓
Paid
 ↓
Pickup Assigned
 ↓
Picked Up
 ↓
Origin Hub
 ↓
Transit
 ↓
Destination Hub
 ↓
Out for Delivery
 ↓
Delivered

Without proper state management, invalid status changes can happen.

---

# 💡 Solution Overview

This project provides a complete backend platform that automates courier operations.

The system provides:

✅ Secure authentication
✅ Role-based access control
✅ Shipment lifecycle management
✅ Stripe payment verification
✅ Courier assignment workflow
✅ Hub transfer tracking
✅ Delivery confirmation
✅ Audit-friendly tracking history

---

# 🏗️ System Workflow

Customer
   |
   |
Create Shipment
   |
   |
Stripe Payment
   |
   |
READY_FOR_PICKUP
   |
   |
Admin Assign Courier
   |
   |
Courier Pickup
   |
   |
Origin Hub
   |
   |
Transit
   |
   |
Destination Hub
   |
   |
Delivery
   |
   |
Delivered


---

# 👥 User Roles

## Customer

Capabilities:

- Register/Login
- Create shipment
- Pay shipment cost
- View shipment history
- Track parcel


---

## Courier

Capabilities:

- View assigned tasks
- Accept pickup/delivery tasks
- Update delivery progress


---

## Admin

Capabilities:

- Manage users
- Create courier accounts
- Manage zones/hubs
- Assign courier
- Monitor shipments
- Manage operations


---

# 🚀 Key Features

## Authentication

- Email/password authentication
- Email OTP verification
- Forgot password with OTP
- Google OAuth login
- JWT access token
- Refresh token rotation
- HTTP-only cookie authentication


---

# Shipment Management

Features:

- Create shipment
- Shipment tracking
- Shipment status management
- Customer shipment history
- Admin shipment monitoring


Shipment lifecycle:
DRAFT
READY_FOR_PICKUP
PICKUP_ASSIGNED
PICKED_UP
AT_ORIGIN_HUB
IN_TRANSIT
AT_DESTINATION_HUB
OUT_FOR_DELIVERY
DELIVERED



---

# Payment Integration

Implemented using Stripe.

Features:

- Stripe Checkout Session
- Webhook verification
- Payment status tracking
- Duplicate webhook protection


Payment flow:


---

# Payment Integration

Implemented using Stripe.

Features:

- Stripe Checkout Session
- Webhook verification
- Payment status tracking
- Duplicate webhook protection


Payment flow:


---

# Payment Integration

Implemented using Stripe.

Features:

- Stripe Checkout Session
- Webhook verification
- Payment status tracking
- Duplicate webhook protection


Payment flow:

---

# Courier Operations

Implemented:

- Courier creation
- Pickup assignment
- Delivery assignment
- Task management
- Pickup confirmation
- Delivery confirmation


---

# Hub Management

Features:

- Zone management
- Hub management
- Hub transfer tracking

Workflow:
Origin Hub
 ↓
Transit
 ↓
Destination Hub


---

# 🛠️ Technology Stack


## Backend

| Technology | Purpose |
|-|-|
| Node.js | Runtime |
| TypeScript | Type safety |
| Express.js | REST API |
| Prisma ORM | Database management |
| PostgreSQL | Primary database |


## Security

| Technology | Purpose |
|-|-|
| JWT | Authentication |
| Redis | OTP and temporary data |
| bcrypt | Password hashing |
| Helmet | Security headers |
| Rate Limiting | API protection |


## External Services

| Service | Purpose |
|-|-|
| Stripe | Payment processing |
| Google OAuth | Social login |
| SMTP | Email verification |


---

# 🗄️ Database Design


Main Entities:

Relationship example:
User
 |
 |
Shipment
 |
 |
TrackingEvent
Shipment
 |
 |
Payment
Shipment
 |
 |
CourierTask


---

# 🔐 Security Implementation


Implemented:

✅ Password hashing with bcrypt

✅ JWT authentication

✅ Refresh token rotation

✅ Token version validation

✅ HTTP-only cookies

✅ Role-based authorization

✅ Input validation using Zod

✅ Rate limiting

✅ Secure headers using Helmet


---

# 🧩 Real Development Challenges & Solutions


## Challenge 1: JWT Refresh Token Management


### Problem

Initially, managing refresh tokens was difficult because:

- Multiple active sessions existed
- Old tokens remained valid
- Logout could not invalidate tokens


### Solution

Implemented:

- RefreshSession database table
- Token hashing
- Token rotation
- Token version checking


Result:
User
 |
 |
Shipment
 |
 |
TrackingEvent
Shipment
 |
 |
Payment
Shipment
 |
 |
CourierTask

---

# 🔐 Security Implementation


Implemented:

✅ Password hashing with bcrypt

✅ JWT authentication

✅ Refresh token rotation

✅ Token version validation

✅ HTTP-only cookies

✅ Role-based authorization

✅ Input validation using Zod

✅ Rate limiting

✅ Secure headers using Helmet


---

# 🧩 Real Development Challenges & Solutions


## Challenge 1: JWT Refresh Token Management


### Problem

Initially, managing refresh tokens was difficult because:

- Multiple active sessions existed
- Old tokens remained valid
- Logout could not invalidate tokens


### Solution

Implemented:

- RefreshSession database table
- Token hashing
- Token rotation
- Token version checking


Result:


Login
 ↓
Refresh Token
 ↓
New Token Pair
 ↓
Old Token Revoked


---

# Challenge 2: Stripe Webhook Verification


## Problem

After payment completion, redirect URL cannot be trusted.

A user could manually call success URL without paying.


### Solution

Implemented Stripe webhook verification.

Only Stripe event:

---

# Challenge 3: Complex Shipment Status Management


## Problem

Without rules:

- Delivered shipment could return to pickup
- Invalid transitions were possible


### Solution

Implemented controlled status workflow.

Example:

Allowed:

---

# Challenge 4: Courier Task Confusion


## Problem

Pickup and delivery tasks were mixed.

Example:

A pickup task ID was used for delivery operation.


### Solution

Separated task types:


Now operations validate task type before execution.

---

# Challenge 5: Google OAuth Backend Testing


## Problem

No frontend was available for Google login testing.


### Solution

Implemented backend-only Google authentication.

Flow:
src
├── app
│   ├── modules
│   │    ├── auth
│   │    ├── user
│   │    ├── shipment
│   │    ├── payment
│   │    ├── courier
│   │    ├── delivery
│   │    ├── hub
│   │    └── zone
│
│   ├── middleware
│   ├── utils
│   └── config
prisma
├── schema


---



## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/Rezwanul777/courier-logistic-management.git
npm install
cp .env.example .env
npx prisma generate

npx prisma migrate dev

npm run dev

## Google Login Implementation and Testing

This backend supports Google login through Google ID token verification
using `google-auth-library`. Google OAuth Playground is used to obtain
ID tokens for testing without a frontend.

### Authentication Flow

1. The tester signs in to Google through OAuth Playground.
2. Google issues an ID token.
3. The tester sends the token to `POST /api/v1/auth/google-login`.
4. The backend verifies the token against `GOOGLE_CLIENT_ID`.
5. The backend checks that Google has verified the user's email.
6. A new Google user is registered with the `CUSTOMER` role.
7. Active users receive application access and refresh tokens,
   which are also set as HTTP-only cookies.

Inactive or soft-deleted accounts cannot log in.

### Environment Configuration

Configure these values locally and in the deployment environment:

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

Keep actual secrets in environment variables. Do not commit them
to the repository.

### Google Cloud Configuration

Create an OAuth client with application type **Web application**.

For OAuth Playground testing, add this exact URL to
**Authorized redirect URIs**:

```text
https://developers.google.com/oauthplayground
```

### Generate an ID Token

1. Open https://developers.google.com/oauthplayground.
2. Open Settings and enable **Use your own OAuth credentials**.
3. Enter the Client ID and Client Secret for your test application.
4. Authorize these scopes:

   ```text
   openid
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```

5. Sign in with your Google account.
6. Select **Exchange authorization code for tokens**.
7. Copy the returned `id_token`.

The credentials used in Playground must match the application's
configured Google Client ID. Google's default Playground credentials
produce tokens for a different audience.

For independent local testing, reviewers should configure their own
Google OAuth client and use the same Client ID in their backend
environment and Playground.

### Test with Postman

**Method:** POST
**Authorization:** No Auth
**Header:** `Content-Type: application/json`

Local URL:

```text
http://localhost:5000/api/v1/auth/google-login
```

Deployed URL:

```text
https://coureir-logistic.vercel.app/api/v1/auth/google-login
```

Body:

```json
{
  "idToken": "PASTE_YOUR_GOOGLE_ID_TOKEN"
}
```

Use the JSON field name `idToken`. Send the Google ID token,
not the Google Client ID, Google access token, or authorization code.

A successful response includes:

```json
{
  "success": true,
  "message": "Logged in with Google",
  "data": {
    "user": {},
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

Postman can reuse the returned cookies for protected requests
on the same host. Application access tokens can also be used
through Bearer authentication.

### Troubleshooting

- **Invalid Google ID token:** Check token expiry and confirm its
  `aud` matches the backend's `GOOGLE_CLIENT_ID`.
- **redirect_uri_mismatch:** Check the exact Playground redirect URI
  in the OAuth client's configuration.
- **Account unavailable:** Check whether the account is inactive
  or soft-deleted.
- **Local works but deployment fails:** Confirm deployed environment
  variables and redeploy after changing them.

OAuth Playground is a testing tool. A frontend can obtain Google
ID tokens through Google Sign-In and submit them to the same endpoint.


---

তারপর API section আলাদা:

```md
## 📌 API Documentation

Base URL:https://coureir-logistic.vercel.app/api/v1


### Authentication
/auth
### User
/users

### Admin User
/admin/users


### Zone
/zones
### Hub
/hubs

### Shipment
/shipments

###Tasks
/tasks

###Delivery

/delivery

###hubtransfer
/hub-transfers

## 🔮 Future Improvements

- Automatic courier allocation
- Route optimization
- Live GPS tracking
- Delivery analytics dashboard
- Refund management
- Mobile courier application

## 👨‍💻 Developer

**Rezwanul Haque**

Backend Developer

GitHub:
https://github.com/Rezwanul777
