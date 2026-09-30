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

# ⚙️ Installation


Clone repository:

```bash
git clone https://github.com/Rezwanul777/courier-logistic-management.git

npm install

cp .env.example .env

📌 API Documentation
Base URL:https://coureir-logistic.vercel.app/api/v1

/auth

/users

/admin/users

/zones

/hubs

/shipments

/payments

/couriers

/tasks

/delivery

/hub-transfers

🔮 Future Improvements
Possible improvements:
- Automatic courier allocation
- Route optimization
- Live GPS tracking
- Delivery analytics dashboard
- Refund management
- Mobile courier application
👨‍💻 Developer
Rezwanul Haque
Backend Developer
GitHub:
https://github.com/Rezwanul777
⭐ Project Status
Completed core logistics workflow:

Project Status
Completed core logistics workflow:
Shipment Creation

↓

Payment Verification

↓

Courier Pickup

↓

Hub Transfer

↓

Delivery Completion
