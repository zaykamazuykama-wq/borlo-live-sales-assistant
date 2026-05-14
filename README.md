# Borlo — Live Sales Assistant

Borlo is a Facebook-first social selling operations assistant for Mongolian live sellers. It is built around the seller workflow:

Коммент → Захиалга → Төлбөр → Нөөц → Баглаа боодол → Тайлан

Live demo: https://borlo-live-sales-assistant.vercel.app

Current stage: guided trial prototype moving toward a controlled Facebook API + Gmail API demo/pilot. Manual paste fallback stays in place.

## What Works Now

- Product setup with product codes, names, prices, categories, colors, sizes, variants, and stock.
- Manual comment paste for Facebook Live-style selling.
- Order creation from seller comments.
- Stock reserve and release for pending, cancelled, expired, and paid orders.
- Manual payment notification text paste and matching.
- Exact payment matching.
- One buyer paying multiple orders in one transfer.
- Underpaid, overpaid, ambiguous, no-match, and late-payment review.
- Paid orders flowing into a packing list.
- Excel-compatible export for seller operations.
- Basic next-action summary.
- localStorage persistence for the guided trial.
- Reset confirmation before clearing trial data.
- Mobile-focused dashboard navigation.

## Next Demo / Pilot Direction

The next Borlo demo/pilot should add controlled real API ingestion while keeping manual fallback paths:

- Facebook API pilot: ingest Facebook Page / Live comments from approved credentials, test seller Pages, or a provider-ready polling/webhook interface.
- Gmail API pilot: read seller-approved payment notification emails with readonly Gmail access during the live/payment window.
- Gmail extraction should produce amount, phone, buyer/memo, and timestamp fields.
- Extracted Gmail payment events feed the existing rule-based payment matching engine.
- Gmail does not replace payment matching logic.
- Manual comment paste remains a fallback.
- Manual payment notification paste remains a fallback.

Do not claim public production Facebook/Gmail integration until Meta App Review, OAuth verification, privacy/security work, deployment, and real seller verification are complete.

## Reports Direction

Reports are a core dashboard module and should not be removed.

Reports should not be over-marketed as deep analytics on the public landing page. Inside the seller dashboard, the Reports view should act as a Live/Campaign closing screen that answers: “Одоо юу хийх вэ?”

Required report content:

- Total comments.
- Total orders / interests / preorders.
- Paid orders.
- Unpaid or expired orders.
- Payment review items.
- Confirmed revenue.
- Amount needing reconciliation.
- Packing-ready orders.
- Delivery-ready orders.
- Stock returned / released.
- Risky buyer orders.
- Combined payments matched.
- Top products and demand signals.
- Copy / print / export actions.

Evidence-based demand reporting should use rule-based signals only. Do not use AI prediction wording.

Demand signal inputs:

- Comments.
- Orders.
- Payments.
- Stockouts.
- Preorders.
- Product, color, and size demand.

Preferred classifications:

- Баталгаатай эрэлт.
- Сонирхол өндөр.
- Нөөц хүрээгүй.
- Эрэлт батлагдаагүй.

## Product Category Direction

Borlo should support all common live-selling categories, not only clothing. Product setup should separate:

- Product category: what kind of item is being sold.
- Size template: how the item is sized, if sizing applies.
- Variant rows: color + size + stock combinations.

Recommended seller-facing categories:

- Хувцас
- Гутал
- Цүнх / Аксессуар
- Гоо сайхан
- Гэр ахуй
- Гал тогоо
- Хүүхэд / Нярай
- Хүнс / Савласан бүтээгдэхүүн
- Цахилгаан бараа / Жижиг хэрэгсэл
- Гар урлал / Бусад

Size template examples:

- Нэг размер / Free size
- Эмэгтэй хувцас: XXS-6XL
- Эрэгтэй хувцас: S-6XL
- Европ размер: 34-56
- Өмд: 24-40
- Цамц / Дээд хувцас: XS-4XL
- Эмэгтэй гутал: 35-42
- Эрэгтэй гутал: 39-46
- Хүүхдийн гутал: 20-35
- Хүүхдийн хувцас: 80-160
- Нярайн хувцас: 0-3 сар through 18-24 сар
- Өөрөө тохируулах

Important product setup rule:

Category should not force a size template. For example, “Гоо сайхан” or “Гэр ахуй” can use Free size, while “Хувцас” can use women, men, European, pants, tops, kids, or custom sizing.

## Social Selling Scope

Borlo is Facebook-first.

Current app state:

- Manual Facebook-style comment paste is active.
- Demo/sample feed can be used for guided trial flows.
- Public production Facebook integration is not yet verified.

Next controlled demo/pilot:

- Real Facebook Page / Live comment ingestion should be implemented behind a provider interface.
- If Meta public approval is not ready, use controlled test credentials or test seller Pages and label the status clearly.
- TikTok, Instagram, Messenger, and Telegram stay out of the active scope.

Future social settings should clearly show:

- Facebook: current primary channel and controlled pilot integration path.
- TikTok: future/import-ready only.
- Instagram: future/import-ready only.
- Messenger: future message automation placeholder only.
- Telegram: future seller notification placeholder only.

Seller-facing wording must avoid implying broad public integrations before they are verified.

## Payment Scope

Bank API is permanently removed from Borlo scope.

Payment matching path:

- Gmail readonly payment notification ingestion for the controlled demo/pilot.
- Manual payment notification paste as fallback.
- Existing rule-based payment matching remains the source of truth.
- Match by phone first, then buyer name fallback.
- One payment can cover multiple orders from one buyer.
- Ambiguous, underpaid, overpaid, buyer-unclear, and no-match events go to payment review.

Not in scope:

- Bank API.
- QPay.
- AI payment decisioning.

## What Is Not Public Production Yet

- Public production Facebook API integration.
- Public production Gmail OAuth integration.
- QPay.
- Bank API.
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
- Барааны ангилал
- Размерын төрөл
- Нэг размер / Free size
- Live хаах тайлан
- Баримттай эрэлтийн тайлан
- Төлбөр тулгах

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
- Банкны API
- QPay холбогдсон
- TikTok холбогдсон
- Instagram холбогдсон
- Public Facebook автомат холболт гэж баталгаагүй claim хийх
- Public Gmail автомат холболт гэж баталгаагүй claim хийх

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

- Restore Reports as a core dashboard module: Live/Campaign closing report, payment report, demand signals, and export/copy actions.
- Add controlled Facebook API provider interface and keep manual comment paste fallback.
- Add Gmail readonly payment notification ingestion and keep manual payment paste fallback.
- Keep Bank API and QPay out of scope.
- Improve payment review clarity.
- Test combined payment matching with real seller examples.
- Observe mobile usage during guided trials.
- Validate with 3-5 sellers.
- Add backend and login only after workflow validation and API pilot clarity.
