# ORACIA Production MVP

ORACIA creates private symbolic self-reflection reports from birth details, numerology-inspired patterns, lunar archetypes, and optional palm-based reflection.

This folder contains the production MVP foundation for automatic paid report delivery:

- Next.js App Router
- Stripe Checkout
- Stripe webhook fulfillment
- Supabase orders/events/email delivery tables
- Resend transactional email
- Private PDF report delivery via signed URLs
- PII-safe logging and analytics rules
- Retry-safe webhook and email fulfillment

## Core flow

1. Customer enters email and birth details.
2. App creates an order with `pending_payment` status.
3. App creates Stripe Checkout Session for $19.99.
4. Stripe sends `checkout.session.completed` webhook.
5. Backend validates payment, amount, currency, mode, and session ID.
6. Backend generates report HTML/PDF.
7. PDF is stored in private Supabase Storage.
8. Email delivery is locked idempotently and sent once.
9. Order becomes `fulfilled`.

## Safety principles

- No prediction guarantees.
- No medical, financial, legal, psychological, relationship, or professional advice.
- No PII in analytics.
- No report fulfillment from the success page.
- No public report storage.
- No duplicate emails from duplicate webhooks.

## Required env vars

```env
APP_BASE_URL=
NEXT_PUBLIC_APP_BASE_URL=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
REPORT_FROM_EMAIL=
ADMIN_API_KEY=
```

`ADMIN_API_KEY` must be a long random secret and must never use an example/default value in production.

## Stripe local webhook test

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

## Full package

The full production scaffold contains app routes, SQL schema, fulfillment helpers, email delivery, storage, risk register, and test plan.