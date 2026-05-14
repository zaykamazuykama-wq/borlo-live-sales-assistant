# ORACIA Production Test Plan

Run before launch.

## Stripe

- Successful checkout creates `checkout.session.completed`.
- Duplicate webhook does not duplicate email.
- Wrong amount is rejected.
- Wrong currency is rejected.
- `payment_status !== paid` is rejected.

## Fulfillment

- `pending_payment -> paid -> report_generated -> fulfilled` works.
- Report generation failure marks `report_failed`.
- PDF storage failure marks `report_failed`.
- Email failure marks `email_failed`.
- Admin retry fulfills failed orders.

## Download

- Valid token redirects to signed URL.
- Invalid token returns 404.
- Expired token returns 410.
- Download count increments atomically.
- Storage bucket is private.

## Privacy

- Logs contain no email/name/birth date/birth place/report HTML.
- Analytics contains only aggregate usage events.

## Email

- Missing APP_BASE_URL blocks email.
- Missing REPORT_FROM_EMAIL blocks email.
- Missing download_token blocks email.
- Name is HTML-escaped.
