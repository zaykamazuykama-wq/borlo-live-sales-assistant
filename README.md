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

Borlo is Facebook-first right now.

Current guided trial:

- Facebook-style comment paste is active.
- Facebook API is not active.
- TikTok, Instagram, Messenger, and Telegram are not active integrations.

Future social settings view should clearly show:

- Facebook: current primary channel.
- TikTok: future/import-ready only.
- Instagram: future/import-ready only.
- Messenger: future message automation placeholder only.
- Telegram: future seller notification placeholder only.

Seller-facing wording should avoid implying real integrations before they exist. Use “дараа холбох боломжтой”, “одоогоор гараар наана”, or “туршилтын урсгал” instead of claiming automatic social integrations.

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
- Барааны ангилал
- Размерын төрөл
- Нэг размер / Free size

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
- TikTok холбогдсон
- Instagram холбогдсон
- Facebook автомат холболт

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

- Complete ProductCategory type and category field in the product model.
- Add category selection to product setup without forcing size template.
- Add settings/social view with honest integration status labels.
- Validate with 3-5 sellers.
- Observe mobile usage during guided trials.
- Test combined payment matching with real seller examples.
- Improve payment review clarity.
- Add backend and login only after workflow validation.
