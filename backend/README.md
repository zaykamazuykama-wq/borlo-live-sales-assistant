# Borlo backend import

This backend was migrated from `zaykamazuykama-wq/live-shop-manager` as part of repository consolidation.

## Status

- Source backend: FastAPI + MongoDB/Motor
- Includes auth, multi-tenant shop isolation, products, live sessions, orders, payment matching, customers, audit logs, and pilot Facebook/Gmail integration wiring.
- Regression tests were migrated with the backend.
- The existing Borlo Next.js guided-trial UI remains the canonical frontend.
- This import is not production-connected yet. Frontend/backend integration should be done in a separate reviewed change.

## Safety

Do not commit a real `.env`. Start from `.env.example`.

## Local validation

```bash
cd backend
python -m pip install -r requirements-dev.txt
pytest -q
```

The source repository remains unchanged until this imported backend is validated in Borlo.
