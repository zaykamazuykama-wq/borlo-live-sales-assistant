# Borlo — Live Sales Assistant

Borlo is a Facebook-first social selling operations assistant for Mongolian live sellers. It is built around the seller workflow:

Коммент → Захиалга → Төлбөр → Нөөц → Баглаа боодол → Тайлан

Live demo: https://borlo-live-sales-assistant.vercel.app

Current stage: local-first guided trial prototype.

## What Works

- Product setup with product codes, names, prices, colors, sizes, variants, and stock.
- Manual comment paste for Facebook Live-style selling.
- Order creation from seller comments.
- Stock reserve and release for pending, cancelled, expired, and paid orders.
- Manual payment notification text paste and matching.
- Exact payment matching.
- One buyer paying multiple orders in one transfer.
- Underpaid, overpaid, ambiguous, no-match, and late-payment review.
- Paid orders flowing into a packing list.
- Excel-compatible export for seller operations.
- Basic report and next-action summary.
- localStorage persistence for the guided trial.
- Reset confirmation before clearing trial data.
- Mobile-focused dashboard navigation.

## What Is Not Active

- Real Facebook API.
- QPay.
- Bank API.
- Gmail payment notification automation.
- TikTok.
- Instagram.
- Messenger automation.
- Login.
- Backend database.
- Multi-device workspace.
- Server-side stock ledger.
- Server-side timer automation.
- Delivery integration.
- Customer CRM.

Important warning:

Одоогоор өгөгдөл энэ төхөөрөмж дээр хадгалагдана.

## Pricing Direction

- First 1 live: Free
- One live / campaign pass: 14,900₮
- Monthly: 79,000₮
- Pro: 149,000₮

## Seller-Facing Copy Rules

Prefer:

- Жишээ live
- Комментоос захиалга үүсгэх
- Төлбөрийн мөрүүдээ наах
- Төлбөр таарсан
- Одоо зарагдаж буй бараа
- Шалгах шаардлагатай

Avoid:

- Туршилтын загвар
- Demo
- Pending
- Review
- Combined payment
- SKU
- Export CSV
- Backup комментоос
- Идэвхтэй бараа
- Банкны хуулга оруулах
- Gmail
- QPay

## Development Commands

```bash
npm run dev
npm run build
```

WSL Windows build command:

```bash
cmd.exe /c "cd /d C:\Users\Muugi\Desktop\LiveShopManager && npm run build"
```

## Next Priorities

- Validate with 3-5 sellers.
- Observe mobile usage during guided trials.
- Test combined payment matching with real seller examples.
- Improve payment review clarity.
- Add backend and login only after workflow validation.
