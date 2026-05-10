'use client'

import { useEffect, useMemo, useState } from 'react'

type РазмерTemplate =
  | 'women-clothing'
  | 'men-clothing'
  | 'women-shoes'
  | 'men-shoes'
  | 'kids-shoes'
  | 'kids-clothing'
  | 'baby-clothing'
  | 'pants'
  | 'tops'
  | 'european'
  | 'one-size'
  | 'custom'
  | 'clothing'
  | 'shoes'

type БарааVariant = {
  color: string
  size: string
  үлдэгдэл: number
}

type Бараа = {
  code: string
  name: string
  price: number
  sizeTemplate: РазмерTemplate
  colors: string[]
  variants: БарааVariant[]
}

type OrderStatus = 'Хүлээгдэж буй' | 'Төлсөн' | 'Expired' | 'Cancelled'

type Order = {
  id: string
  buyerDisplayName: string
  productCode: string
  productName: string
  color: string
  size: string
  quantity: number
  amount: number
  status: OrderStatus
  sourceCommentText: string
  createdAt: number
  expiresAt: number
  paidAt?: number
  cancelledAt?: number
  expiredAt?: number
  phone?: string
}

type ШалгахItem = {
  id: string
  text: string
  reason: string
  createdAt: number
}

type PaymentStatus = 'matched' | 'combined_matched' | 'underpaid' | 'overpaid' | 'ambiguous' | 'no_match' | 'late_payment'

type PaymentEvent = {
  id: string
  rawText: string
  amount?: number
  productCode?: string
  buyerName?: string
  phone?: string
  orderId?: string
  orderIds?: string[]
  status?: PaymentStatus
  matchType?: string
  reason?: string
  createdAt: number
}

const DEFAULT_COLOR = 'Үндсэн өнгө'

const SIZE_TEMPLATES: Record<РазмерTemplate, string[]> = {
  'women-clothing': ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'],
  'men-clothing': ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'],
  'women-shoes': ['35', '36', '37', '38', '39', '40', '41', '42'],
  'men-shoes': ['39', '40', '41', '42', '43', '44', '45', '46'],
  'kids-shoes': ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35'],
  'kids-clothing': ['80', '90', '100', '110', '120', '130', '140', '150', '160'],
  'baby-clothing': ['0-3сар', '3-6сар', '6-12сар', '12-18сар', '18-24сар'],
  pants: ['26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '38', '40'],
  tops: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'],
  european: ['34', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60'],
  'one-size': ['Нэг размер'],
  custom: [],
  clothing: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'],
  shoes: ['35', '36', '37', '38', '39', '40', '41', '42'],
}

const SIZE_TEMPLATE_LABELS: Record<РазмерTemplate, string> = {
  'women-clothing': 'Эмэгтэй хувцас',
  'men-clothing': 'Эрэгтэй хувцас',
  'women-shoes': 'Эмэгтэй гутал',
  'men-shoes': 'Эрэгтэй гутал',
  'kids-shoes': 'Хүүхдийн гутал',
  'kids-clothing': 'Хүүхдийн хувцас',
  'baby-clothing': 'Нярай хувцас',
  pants: 'Өмдний размер',
  tops: 'Цамц / дээд хувцас',
  european: 'Европ размер',
  'one-size': 'Нэг размер',
  custom: 'Өөрийн размер',
  clothing: 'Эмэгтэй хувцас',
  shoes: 'Эмэгтэй гутал',
}

const SELLER_SIZE_TEMPLATE_OPTIONS: РазмерTemplate[] = [
  'women-clothing',
  'men-clothing',
  'women-shoes',
  'men-shoes',
  'kids-shoes',
  'kids-clothing',
  'baby-clothing',
  'pants',
  'tops',
  'european',
  'one-size',
  'custom',
]

const SUPPORTED_COLORS = [
  'Хар',
  'Цагаан',
  'Улаан',
  'Хөх',
  'Цэнхэр',
  'Ногоон',
  'Шар',
  'Ягаан',
  'Бор',
  'Шаргал',
  'Саарал',
  'Нил ягаан',
  'Алтлаг',
  'Мөнгөлөг',
]

const DEFAULT_PRODUCTS: Бараа[] = [
  {
    code: 'A12',
    name: 'Даашинз',
    price: 89000,
    sizeTemplate: 'women-clothing',
    colors: ['Хар', 'Улаан'],
    variants: [
      { color: 'Хар', size: 'S', үлдэгдэл: 1 },
      { color: 'Хар', size: 'M', үлдэгдэл: 2 },
      { color: 'Хар', size: 'L', үлдэгдэл: 1 },
      { color: 'Хар', size: 'XL', үлдэгдэл: 1 },
      { color: 'Улаан', size: 'M', үлдэгдэл: 1 },
      { color: 'Улаан', size: 'L', үлдэгдэл: 2 },
    ],
  },
  {
    code: 'B01',
    name: 'Цүнх',
    price: 120000,
    sizeTemplate: 'one-size',
    colors: ['Хар'],
    variants: [{ color: 'Хар', size: 'Нэг размер', үлдэгдэл: 3 }],
  },
  {
    code: 'C01',
    name: 'Эмэгтэй гутал',
    price: 150000,
    sizeTemplate: 'women-shoes',
    colors: ['Цагаан', 'Хар'],
    variants: [
      { color: 'Цагаан', size: '37', үлдэгдэл: 1 },
      { color: 'Цагаан', size: '38', үлдэгдэл: 2 },
      { color: 'Цагаан', size: '42', үлдэгдэл: 1 },
      { color: 'Хар', size: '38', үлдэгдэл: 1 },
      { color: 'Хар', size: '39', үлдэгдэл: 2 },
      { color: 'Хар', size: '40', үлдэгдэл: 1 },
      { color: 'Хар', size: '41', үлдэгдэл: 1 },
    ],
  },
  {
    code: 'D01',
    name: 'Пальто',
    price: 210000,
    sizeTemplate: 'european',
    colors: ['Хар', 'Саарал'],
    variants: [
      { color: 'Хар', size: '40', үлдэгдэл: 1 },
      { color: 'Хар', size: '42', үлдэгдэл: 2 },
      { color: 'Саарал', size: '44', үлдэгдэл: 1 },
    ],
  },
  {
    code: 'E01',
    name: 'Хүүхдийн гутал',
    price: 79000,
    sizeTemplate: 'kids-shoes',
    colors: ['Цагаан'],
    variants: [
      { color: 'Цагаан', size: '28', үлдэгдэл: 1 },
      { color: 'Цагаан', size: '29', үлдэгдэл: 2 },
      { color: 'Цагаан', size: '30', үлдэгдэл: 1 },
    ],
  },
  {
    code: 'F01',
    name: 'Эрэгтэй өмд',
    price: 99000,
    sizeTemplate: 'pants',
    colors: ['Хар'],
    variants: [
      { color: 'Хар', size: '30', үлдэгдэл: 1 },
      { color: 'Хар', size: '32', үлдэгдэл: 2 },
      { color: 'Хар', size: '34', үлдэгдэл: 1 },
    ],
  },
]

const SOCIAL_LINKS = {
  facebook: '#',
  instagram: '#',
  tiktok: '#',
  messenger: '#',
  telegram: '#',
}

const STORAGE_KEYS = {
  products: 'live-shop-products',
  activeБарааCode: 'live-shop-active-product-code',
  orders: 'live-shop-orders',
  unclearComments: 'live-shop-unclear-comments',
  paymentReviewEvents: 'live-shop-payment-шалгах-events',
  successfulPaymentEvents: 'live-shop-successful-payment-events',
  reservationTimeoutMinutes: 'live-shop-reservation-timeout-minutes',
}

const BUY_KEYWORDS = ['авъя', 'авя', 'авая', 'авна', 'avya', 'avii', 'awya']
const DEFAULT_RESERVATION_TIMEOUT_MINUTES = 15
const RESERVATION_TIMEOUT_OPTIONS = [10, 15, 20, 30, 60, 'custom'] as const


function money(value: number) {
  return `${value.toLocaleString('mn-MN')}₮`
}

function dateTime(value?: number) {
  if (!value) return '-'
  return new Date(value).toLocaleString('mn-MN')
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function orderNumber(orderId: string) {
  const match = orderId.match(/ORD-(\d+)/)
  return match ? Number(match[1]) : 0
}

function nextOrderId(num: number) {
  return `ORD-${String(num).padStart(4, '0')}`
}

function hasBuyKeyword(text: string) {
  const lower = text.toLowerCase()
  return BUY_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function productCodeRegex(code: string) {
  return new RegExp(`(^|[^a-zA-Z0-9])${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zA-Z0-9]|$)`, 'i')
}

function findБарааInText(text: string, products: Бараа[]) {
  return products.find((product) => productCodeRegex(product.code).test(text))
}

function normalizeРазмерTemplate(template?: РазмерTemplate): РазмерTemplate {
  if (template === 'clothing') return 'women-clothing'
  if (template === 'shoes') return 'women-shoes'
  return template || 'one-size'
}

function normalizeБараа(product: Бараа & { үлдэгдэл?: number; sizeTemplate?: РазмерTemplate }): Бараа {
  const sizeTemplate = normalizeРазмерTemplate(product.sizeTemplate)
  const colors = product.colors?.length ? product.colors : [DEFAULT_COLOR]
  const variants = product.variants?.length
    ? product.variants
    : [{ color: colors[0], size: SIZE_TEMPLATES[sizeTemplate][0] || 'Нэг размер', үлдэгдэл: product.үлдэгдэл || 0 }]

  return { ...product, sizeTemplate, colors, variants }
}

function totalStock(product: Бараа) {
  return product.variants.reduce((sum, variant) => sum + variant.үлдэгдэл, 0)
}

function productРазмерs(product: Бараа) {
  if (product.sizeTemplate !== 'custom') return SIZE_TEMPLATES[product.sizeTemplate]
  return Array.from(new Set(product.variants.map((variant) => variant.size)))
}

function variantKey(productCode: string, color: string, size: string) {
  return `${productCode}||${color}||${size}`
}

function findVariant(product: Бараа, color: string, size: string) {
  return product.variants.find((variant) => variant.color === color && variant.size === size)
}

function updateVariantStock(product: Бараа, color: string, size: string, delta: number): Бараа {
  return {
    ...product,
    variants: product.variants.map((variant) =>
      variant.color === color && variant.size === size ? { ...variant, үлдэгдэл: variant.үлдэгдэл + delta } : variant,
    ),
  }
}

function findKnownӨнгөInText(text: string) {
  const lower = text.toLowerCase()
  return [...SUPPORTED_COLORS]
    .sort((a, b) => b.length - a.length)
    .find((color) => new RegExp(`(^|[^\p{L}])${color.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\p{L}]|$)`, 'u').test(lower))
}

function detectӨнгө(text: string, product: Бараа) {
  const colors = product.colors.length ? product.colors : [DEFAULT_COLOR]
  if (colors.length === 1) return { color: colors[0] }

  const detected = findKnownӨнгөInText(text)
  if (!detected) return { reason: 'Өнгө тодорхойгүй байна' }

  const productӨнгө = colors.find((color) => color.toLowerCase() === detected.toLowerCase())
  return productӨнгө ? { color: productӨнгө } : { reason: 'Ийм өнгө алга байна' }
}

function sizeRegex(size: string) {
  return new RegExp(`(^|[^\p{L}\p{N}-])${size.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\p{L}\p{N}-]|$)`, 'iu')
}

function detectРазмер(text: string, product: Бараа) {
  const sizes = productРазмерs(product)
  if (sizes.length === 1) return { size: sizes[0] }

  const detected = [...sizes].sort((a, b) => b.length - a.length).find((size) => sizeRegex(size).test(text))
  if (detected) return { size: detected }

  const allKnownРазмерs = Array.from(new Set(Object.values(SIZE_TEMPLATES).flat())).sort((a, b) => b.length - a.length)
  const knownButUnavailable = allKnownРазмерs.find((size) => sizeRegex(size).test(text))
  return knownButUnavailable ? { reason: 'Ийм variant алга байна' } : { reason: 'Сайз тодорхойгүй байна' }
}

function parseӨнгөsInput(value: string) {
  const colors = value.split(',').map((color) => color.trim()).filter(Boolean)
  return colors.length > 0 ? colors : [DEFAULT_COLOR]
}

function parseVariantStockInput(value: string, colors: string[], template: РазмерTemplate) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.+?)\s*\/\s*(.+?)\s*:\s*(\d+)$/)
      if (!match) return undefined
      const color = colors.find((item) => item.toLowerCase() === match[1].trim().toLowerCase()) || match[1].trim()
      const rawРазмер = match[2].trim()
      const size = SIZE_TEMPLATES[template].find((item) => item.toLowerCase() === rawРазмер.toLowerCase()) || rawРазмер
      return { color, size, үлдэгдэл: Number(match[3]) }
    })
    .filter((variant): variant is БарааVariant =>
      Boolean(variant && colors.includes(variant.color) && (template === 'custom' || SIZE_TEMPLATES[template].includes(variant.size))),
    )
}

function extractQuantity(text: string, productCode?: string) {
  let cleaned = text
  if (productCode) {
    cleaned = cleaned.replace(new RegExp(productCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
  }

  const quantityWithUnit = cleaned.match(/(\d+)\s*(ширхэг|ш)(?=\s|$)/i)
  if (quantityWithUnit) {
    return Math.max(1, Number(quantityWithUnit[1]) || 1)
  }

  return 1
}

function buyerFromComment(line: string) {
  const [name] = line.split(':')
  if (line.includes(':') && name.trim()) return name.trim()
  const firstWord = line.trim().split(/\s+/)[0]
  return firstWord || 'Нэргүй'
}

function parsePaymentLine(rawText: string) {
  const amountMatch = rawText.match(/(?:^|\s)(\d{1,3}(?:,\d{3})+|\d{4,})(?=\s|$)/)
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : undefined
  const productMatch = rawText.match(/\b[A-Z]{1,3}\d{1,3}\b/i)
  const productCode = productMatch?.[0].toUpperCase()
  const phoneMatch = rawText.match(/\b\d{8}\b/)
  const phone = phoneMatch?.[0]

  let buyerName = rawText
  ;[amountMatch?.[0], productMatch?.[0], phone].forEach((part) => {
    if (part) buyerName = buyerName.replace(part, ' ')
  })
  buyerName = buyerName.replace(/\s+/g, ' ').trim()

  return { amount, productCode, phone, buyerName, rawText, createdAt: Date.now() }
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function isFuzzyBuyerMatch(orderBuyerName: string, parsedBuyerName?: string) {
  const buyerName = normalizeName(parsedBuyerName || '')
  const orderBuyer = normalizeName(orderBuyerName)
  return Boolean(buyerName && orderBuyer && (orderBuyer.includes(buyerName) || buyerName.includes(orderBuyer)))
}

function findExactAmountCombinations(candidates: Order[], targetAmount?: number) {
  if (typeof targetAmount !== 'number') return []

  const target = targetAmount
  const combinations: Order[][] = []

  function walk(startIndex: number, selected: Order[], sum: number) {
    if (sum === target) {
      combinations.push([...selected])
      return
    }

    if (sum > target || startIndex >= candidates.length) return

    for (let index = startIndex; index < candidates.length; index += 1) {
      const order = candidates[index]
      walk(index + 1, [...selected, order], sum + order.amount)
    }
  }

  walk(0, [], 0)
  return combinations
}

function csvEscape(value: string | number | undefined) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function getPaymentReviewReasonLabel(reason: string, item: PaymentEvent): string {
  if (item.status === 'late_payment') return 'Хоцорсон төлбөр';
  if (item.status === 'underpaid') return 'Дутуу төлөлт';
  if (item.status === 'overpaid') return 'Илүү төлөлт';
  if (item.status === 'ambiguous') return 'Олон боломжит таарсан';
  if (item.status === 'no_match') return 'Таараагүй төлбөр';
  if (reason.includes('Төлбөр дутуу байна')) return 'Төлбөр дутуу';
  if (reason.includes('Төлбөр илүү байна')) return 'Төлбөр илүү';
  if (reason.includes('Олон боломжит захиалга олдлоо')) return 'Олон захиалга таарч байна';
  if (reason.includes('Олон боломжит захиалгын нийлбэр таарч байна')) return 'Нийлбэр дүн таарч байна';
  if (reason.includes('Тохирох pending захиалга олдсонгүй')) return 'Захиалга тодорхойгүй';
  if (item.buyerName === '') return 'Худалдан авагчийн нэр дутуу';
  if (!item.phone) return 'Худалдан авагчийн утас дутуу';
  return 'Гараар шалгах шаардлагатай';
}

function getPaymentStatusLabel(status?: PaymentStatus) {
  if (status === 'matched') return 'Таарсан'
  if (status === 'combined_matched') return 'Нийлмэл төлбөр таарсан'
  if (status === 'underpaid') return 'Дутуу төлөлт'
  if (status === 'overpaid') return 'Илүү төлөлт'
  if (status === 'ambiguous') return 'Олон боломжит таарсан'
  if (status === 'no_match') return 'Таараагүй төлбөр'
  if (status === 'late_payment') return 'Хоцорсон төлбөр'
  return 'Төлөв тодорхойгүй'
}

function LandingPage({ onDemo, onDashboard }: { onDemo: () => void; onDashboard: () => void }) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-8 pt-20">
        <div className="text-center">
          <p className="text-sm font-semibold text-amber-600">Borlo</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Лайв Захиалга Тулгагч</h1>
          <p className="mt-4 text-lg text-slate-600">
            Facebook Live-ийн комментээс захиалга үүсгэж, төлбөр, нөөц, баглаа боодлыг нэг дор хянах туслах.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <button
            onClick={onDemo}
            className="flex-1 rounded-2xl bg-amber-300 px-6 py-4 text-center text-lg font-bold text-slate-950 shadow active:scale-95"
          >
            Demo үзэх
          </button>
          <button
            onClick={onDashboard}
            className="flex-1 rounded-2xl bg-slate-950 px-6 py-4 text-center text-lg font-bold text-white shadow active:scale-95"
          >
            Seller dashboard
          </button>
        </div>
      </div>
    </main>
  )
}

export default function LiveShopManagerDemo() {
  const [trialLead, setTrialLead] = useState({
    facebook: '',
    phone: '',
    product: '',
    liveCount: '',
    plan: 'Эхлээд үнэгүй туршъя',
  })
  const [copyStatus, setCopyStatus] = useState('')
  const [paymentRequestCopyStatus, setPaymentRequestCopyStatus] = useState('')
  const [demoResetFeedback, setDemoResetFeedback] = useState('')
  const [packingListCopyStatus, setPackingListCopyStatus] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [products, setБарааs] = useState<Бараа[]>(DEFAULT_PRODUCTS)
  const [activeБарааCode, setActiveБарааCode] = useState('A12')
  const [orders, setOrders] = useState<Order[]>([])
  const [unclearComments, setUnclearComments] = useState<ШалгахItem[]>([])
  const [paymentReviewEvents, setPaymentReviewEvents] = useState<PaymentEvent[]>([])
  const [successfulPaymentEvents, setSuccessfulPaymentEvents] = useState<PaymentEvent[]>([])
  const [commentPaste, setCommentPaste] = useState('Болор: A12 хар M авъя\nСараа: A12 улаан L 2ш\nНомин: C01 цагаан 38 авъя')
  const [paymentPaste, setPaymentPaste] = useState('89000 Болор A12 99112233\n239000 Болор 99112233\n70000 Болор 99112233\n500000 Болор 99112233\n88000 Бат 88119922')
  const [newБараа, setNewБараа] = useState({
    code: '',
    name: '',
    price: '',
    sizeTemplate: 'women-clothing' as РазмерTemplate,
    colors: '',
    variantStock: '',
  })
  const [language, setLanguage] = useState<'mn' | 'en'>('mn')
  const [reservationTimeoutMinutes, setReservationTimeoutMinutes] = useState(DEFAULT_RESERVATION_TIMEOUT_MINUTES)
  const [customReservationTimeout, setCustomReservationTimeout] = useState(String(DEFAULT_RESERVATION_TIMEOUT_MINUTES))
  const [facebookConnectionState, setFacebookConnectionState] = useState<'not-connected' | 'connected' | 'live-found' | 'importing'>('not-connected')
  const [liveFinished, setLiveFinished] = useState(false)
  const [paymentWindow, setPaymentWindow] = useState('1 цаг')
  const [mode, setMode] = useState<'landing' | 'dashboard'>('landing')

  useEffect(() => {
    const syncModeFromHash = () => {
      const hash = window.location.hash || ''
      const knownSectionHashes = new Set(['#home', '#live', '#orders', '#payments', '#products', '#packing', '#reports', '#insights', '#trial', '#facebook-live'])
      setMode(hash && knownSectionHashes.has(hash) ? 'dashboard' : 'landing')
    }

    syncModeFromHash()
    window.addEventListener('hashchange', syncModeFromHash)
    return () => window.removeEventListener('hashchange', syncModeFromHash)
  }, [])

  const LANG_TEXT = {
    mn: {
      mainHeading: "Лайв Захиалга Тулгагч",
      subtitle: "Шууд борлуулалтын туслах",
      flow: "Коммент → Захиалга → Төлбөр → Баглаа боодол",
      trialBadge: "Туршилтын хувилбар — Facebook холболт одоогооргүй",
      demoResetButton: "Демо сэргээх",
      pendingCount: "Хүлээгдэж буй",
      paidPackingCount: "Төлсөн / Баглах",
      revenue: "Орлого",
      homeNav: "Нүүр",
      liveNav: "Шууд",
      ordersNav: "Захиалга",
      paymentsNav: "Төлбөр",
      productsNav: "Бараа",
      packingNav: "Баглаа боодол",
      insightsNav: "Тайлан",
      sellerLeadTitle: "Демо хүсэлт",
      sellerLeadCopy: "Анхны 2 live дээр Borlo-г туршиж үзээд, коммент → захиалга → төлбөр → баглаа боодлын урсгалыг шалгаарай.",
      facebookPlaceholder: "Facebook хуудас / live хаяг",
      phonePlaceholder: "Утас",
      productPlaceholder: "Гол зардаг бараа",
      liveCountPlaceholder: "Сард хэдэн live хийдэг вэ?",
      planHeading: "Сонирхож буй хувилбар:",
      basicPlan: "Basic 99,000₮",
      autoPlan: "Auto 149,000₮ + 1%",
      freeTrial: "Эхлээд үнэгүй туршъя",
      demoCta: "Демо авах",
      demoFormNote: "Одоогоор туршилтын form — илгээх backend холбогдоогүй",
    },
    en: {
      mainHeading: "Live Shop Manager",
      subtitle: "Live Sales Assistant",
      flow: "Comment → Order → Payment → Stock → Packing list → CSV",
      trialBadge: "Trial version — real Facebook/QPay integrations are not connected yet",
      demoResetButton: "Demo reset",
      pendingCount: "Хүлээгдэж буй count",
      paidPackingCount: "Төлсөн / Packing count",
      revenue: "Revenue",
      homeNav: "Home",
      liveNav: "Live",
      ordersNav: "Orders",
      paymentsNav: "Payments",
      productsNav: "Барааs",
      packingNav: "Packing List",
      insightsNav: "Insights",
      sellerLeadTitle: "Request a Trial",
      sellerLeadCopy: "Try Borlo on your first 2 live streams and verify the Comment → Order → Payment → Stock → Packing list flow.",
      facebookPlaceholder: "Facebook page / live link",
      phonePlaceholder: "Phone",
      productPlaceholder: "Main products sold",
      liveCountPlaceholder: "How many live streams per month?",
      planHeading: "Interested plan:",
      basicPlan: "Basic 99,000₮",
      autoPlan: "Auto 149,000₮ + 1%",
      freeTrial: "Try free first",
      demoCta: "Get Demo",
      demoFormNote: "Currently a trial form — no backend integration for submission",
    },
  };

  useEffect(() => {
    setБарааs(safeParse<Бараа[]>(localStorage.getItem(STORAGE_KEYS.products), DEFAULT_PRODUCTS).map(normalizeБараа))
    setActiveБарааCode(localStorage.getItem(STORAGE_KEYS.activeБарааCode) || 'A12')
    setOrders(safeParse<Order[]>(localStorage.getItem(STORAGE_KEYS.orders), []))
    setUnclearComments(safeParse<ШалгахItem[]>(localStorage.getItem(STORAGE_KEYS.unclearComments), []))
    setPaymentReviewEvents(safeParse<PaymentEvent[]>(localStorage.getItem(STORAGE_KEYS.paymentReviewEvents), []))
    setSuccessfulPaymentEvents(safeParse<PaymentEvent[]>(localStorage.getItem(STORAGE_KEYS.successfulPaymentEvents), []))
    const savedTimeout = Number(localStorage.getItem(STORAGE_KEYS.reservationTimeoutMinutes))
    const initialTimeout = Number.isFinite(savedTimeout) && savedTimeout > 0 ? savedTimeout : DEFAULT_RESERVATION_TIMEOUT_MINUTES
    setReservationTimeoutMinutes(initialTimeout)
    setCustomReservationTimeout(String(initialTimeout))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products))
  }, [hydrated, products])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEYS.activeБарааCode, activeБарааCode)
  }, [activeБарааCode, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders))
  }, [hydrated, orders])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEYS.unclearComments, JSON.stringify(unclearComments))
  }, [hydrated, unclearComments])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEYS.paymentReviewEvents, JSON.stringify(paymentReviewEvents))
  }, [hydrated, paymentReviewEvents])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEYS.successfulPaymentEvents, JSON.stringify(successfulPaymentEvents))
  }, [hydrated, successfulPaymentEvents])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEYS.reservationTimeoutMinutes, String(reservationTimeoutMinutes))
  }, [hydrated, reservationTimeoutMinutes])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const expiredPendingOrders = orders.filter((order) => order.status === 'Хүлээгдэж буй' && order.expiresAt <= now)
      if (expiredPendingOrders.length === 0) return

      const releaseByVariant = new Map<string, number>()
      expiredPendingOrders.forEach((order) => {
        const key = variantKey(order.productCode, order.color, order.size)
        releaseByVariant.set(key, (releaseByVariant.get(key) || 0) + order.quantity)
      })

      setБарааs((currentБарааs) =>
        currentБарааs.map((product) => ({
          ...product,
          variants: product.variants.map((variant) => ({
            ...variant,
            үлдэгдэл: variant.үлдэгдэл + (releaseByVariant.get(variantKey(product.code, variant.color, variant.size)) || 0),
          })),
        })),
      )

      const expiredIds = new Set(expiredPendingOrders.map((order) => order.id))
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          expiredIds.has(order.id) && order.status === 'Хүлээгдэж буй'
            ? { ...order, status: 'Expired', expiredAt: now }
            : order,
        ),
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [orders])

  const activeБараа = products.find((product) => product.code === activeБарааCode) || products[0]
  const pendingOrders = orders.filter((order) => order.status === 'Хүлээгдэж буй')
  const paidOrders = orders.filter((order) => order.status === 'Төлсөн')
  const revenue = paidOrders.reduce((sum, order) => sum + order.amount, 0)
  const paidPackingOrders = paidOrders
  const packingGroups = useMemo(() => {
    const grouped = new Map<string, {
      productCode: string
      productName: string
      color: string
      size: string
      totalQuantity: number
      buyers: Set<string>
    }>()

    paidPackingOrders.forEach((order) => {
      const key = `${order.productCode}__${order.color}__${order.size}`
      if (!grouped.has(key)) {
        grouped.set(key, {
          productCode: order.productCode,
          productName: order.productName,
          color: order.color,
          size: order.size,
          totalQuantity: 0,
          buyers: new Set<string>(),
        })
      }
      const item = grouped.get(key)!
      item.totalQuantity += order.quantity
      item.buyers.add(order.buyerDisplayName)
    })

    return Array.from(grouped.values())
  }, [paidPackingOrders])

  const deliveryRows = useMemo(() => paidPackingOrders.map((order) => ({
    buyer: order.buyerDisplayName,
    phone: order.phone || '',
    address: '',
    paidOrder: `${order.id} (${order.productCode})`,
    totalAmount: order.amount,
    status: order.phone ? 'Хүргэлт бэлдэх' : 'Хаяг дутуу',
  })), [paidPackingOrders])
  const reviewAmount = paymentReviewEvents.reduce((sum, item) => sum + (item.amount || 0), 0)
  const pendingAmount = pendingOrders.reduce((sum, order) => sum + order.amount, 0)
  const paymentStatusCounts = useMemo(() => ({
    matched: successfulPaymentEvents.filter((item) => item.status === 'matched').length,
    combinedMatched: successfulPaymentEvents.filter((item) => item.status === 'combined_matched').length,
    underpaid: paymentReviewEvents.filter((item) => item.status === 'underpaid').length,
    overpaid: paymentReviewEvents.filter((item) => item.status === 'overpaid').length,
    ambiguous: paymentReviewEvents.filter((item) => item.status === 'ambiguous').length,
    noMatch: paymentReviewEvents.filter((item) => item.status === 'no_match').length,
    latePayments: paymentReviewEvents.filter((item) => item.status === 'late_payment').length,
  }), [paymentReviewEvents, successfulPaymentEvents])

  // Demand insights using May 4 final integrated product spec formula:
  // Demand score = (comment mentions * 1)
  //               + (successful orders * 3)
  //               + (paid orders * 5)
  //               + (out-of-stock requests * 4)
  //               + (review/unmatched interests * 1)
  const {
    productInsights,
    variantInsights,
    todayMetrics,
    outOfStockList,
    restockSuggestions,
    nextLiveSuggestions,
    lowStockWarnings,
  } = useMemo(() => {
    const productMetrics: Record<string, any> = {}
    const variantMetrics: Record<string, any> = {}

    products.forEach((product) => {
      productMetrics[product.code] = {
        productName: product.name,
        commentMentions: 0,
        successfulOrders: 0,
        paidOrders: 0,
        outOfStockRequests: 0,
        reviewCount: 0,
        availableStock: totalStock(product),
      }

      product.variants.forEach((variant) => {
        const key = variantKey(product.code, variant.color, variant.size)
        variantMetrics[key] = {
          productCode: product.code,
          productName: product.name,
          color: variant.color,
          size: variant.size,
          commentMentions: 0,
          successfulOrders: 0,
          paidOrders: 0,
          outOfStockRequests: 0,
          reviewCount: 0,
          availableStock: variant.үлдэгдэл,
        }
      })
    })

    orders.forEach((order) => {
      const productMetric = productMetrics[order.productCode]
      if (!productMetric) return

      productMetric.commentMentions += 1
      productMetric.successfulOrders += 1

      if (order.status === 'Төлсөн') {
        productMetric.paidOrders += 1
      }

      const key = variantKey(order.productCode, order.color, order.size)
      const variantMetric = variantMetrics[key]

      if (variantMetric) {
        variantMetric.commentMentions += 1
        variantMetric.successfulOrders += 1

        if (order.status === 'Төлсөн') {
          variantMetric.paidOrders += 1
        }
      }
    })

    unclearComments.forEach((item) => {
      const product = findБарааInText(item.text, products)
      if (!product) return

      const productMetric = productMetrics[product.code]
      if (!productMetric) return

      const colorResult = detectӨнгө(item.text, product)
      const sizeResult = detectРазмер(item.text, product)
      const key =
        colorResult.color && sizeResult.size ? variantKey(product.code, colorResult.color, sizeResult.size) : null

      const isOutOfStock = item.reason?.includes('Үлдэгдэл хүрэлцэхгүй')

      if (isOutOfStock) {
        productMetric.outOfStockRequests += 1
        if (key && variantMetrics[key]) variantMetrics[key].outOfStockRequests += 1
      } else {
        productMetric.reviewCount += 1
        if (key && variantMetrics[key]) variantMetrics[key].reviewCount += 1
      }
    })

    paymentReviewEvents.forEach((item) => {
      const relatedOrderIds = [
        ...(item.orderIds || []),
        ...(item.orderId ? [item.orderId] : []),
      ]

      const relatedOrders = relatedOrderIds
        .map((orderId) => orders.find((order) => order.id === orderId))
        .filter((order): order is Order => Boolean(order))

      if (relatedOrders.length > 0) {
        relatedOrders.forEach((order) => {
          const productMetric = productMetrics[order.productCode]
          if (productMetric) {
            productMetric.reviewCount += 1
          }

          const key = variantKey(order.productCode, order.color, order.size)
          const variantMetric = variantMetrics[key]
          if (variantMetric) {
            variantMetric.reviewCount += 1
          }
        })
        return
      }

      const code = item.productCode?.toUpperCase()
      if (code && productMetrics[code]) {
        productMetrics[code].reviewCount += 1
      }
    })

    const productInsightsArr = Object.entries(productMetrics)
      .map(([code, metric]: [string, any]) => ({
        code,
        name: metric.productName,
        ...metric,
        demandScore:
          metric.commentMentions * 1 +
          metric.successfulOrders * 3 +
          metric.paidOrders * 5 +
          metric.outOfStockRequests * 4 +
          metric.reviewCount * 1,
      }))
      .sort((a, b) => b.demandScore - a.demandScore)

    const variantInsightsArr = Object.entries(variantMetrics)
      .map(([key, metric]: [string, any]) => ({
        key,
        ...metric,
        demandScore:
          metric.commentMentions * 1 +
          metric.successfulOrders * 3 +
          metric.paidOrders * 5 +
          metric.outOfStockRequests * 4 +
          metric.reviewCount * 1,
      }))
      .sort((a, b) => b.demandScore - a.demandScore)

    const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()
    const todayOrders = orders.filter((order) => order.createdAt >= todayStart)
    const todayUnclearComments = unclearComments.filter((item) => item.createdAt >= todayStart)
    const todayPaymentReviewEvents = paymentReviewEvents.filter((item) => item.createdAt >= todayStart)

    const todayMetrics = {
      commentMentions: todayOrders.length + todayUnclearComments.length,
      successfulOrders: todayOrders.length,
      paidOrders: todayOrders.filter((order) => order.status === 'Төлсөн').length,
      outOfStockRequests: todayUnclearComments.filter((item) => item.reason?.includes('Үлдэгдэл хүрэлцэхгүй')).length,
      reviewCount:
        todayUnclearComments.filter((item) => !item.reason?.includes('Үлдэгдэл хүрэлцэхгүй')).length +
        todayPaymentReviewEvents.length,
    }

    return {
      productInsights: productInsightsArr,
      variantInsights: variantInsightsArr,
      todayMetrics,
      outOfStockList: productInsightsArr.filter((item) => item.outOfStockRequests > 0),
      restockSuggestions: productInsightsArr.filter((item) => item.availableStock <= 2 && item.demandScore > 0),
      nextLiveSuggestions: variantInsightsArr.slice(0, 5),
      lowStockWarnings: variantInsightsArr.filter((item) => item.availableStock <= 1),
    }
  }, [products, orders, unclearComments, paymentReviewEvents])


  const maxOrderNumber = useMemo(() => Math.max(0, ...orders.map((order) => orderNumber(order.id))), [orders])

  function setReservationTimeoutFromInput(value: string) {
    if (value === 'custom') {
      const parsed = Number(customReservationTimeout)
      setReservationTimeoutMinutes(Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RESERVATION_TIMEOUT_MINUTES)
      return
    }

    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    setReservationTimeoutMinutes(parsed)
    setCustomReservationTimeout(String(parsed))
  }

  function extendReservation(orderId: string, minutes: number) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId && order.status === 'Хүлээгдэж буй'
          ? { ...order, expiresAt: order.expiresAt + minutes * 60 * 1000 }
          : order,
      ),
    )
  }

  function releasePendingOrder(order: Order) {
    if (order.status !== 'Хүлээгдэж буй') return
    const confirmed = window.confirm(`${order.id} захиалгын нөөцийг суллах уу?`)
    if (!confirmed) return

    setOrders((currentOrders) =>
      currentOrders.map((item) =>
        item.id === order.id ? { ...item, status: 'Cancelled', cancelledAt: Date.now() } : item,
      ),
    )

    setБарааs((currentProducts) =>
      currentProducts.map((product) =>
        product.code === order.productCode
          ? updateVariantStock(product, order.color, order.size, order.quantity)
          : product,
      ),
    )
  }

  function addБараа() {
    const code = newБараа.code.trim().toUpperCase()
    const name = newБараа.name.trim()
    const price = Number(newБараа.price)
    const colors = parseӨнгөsInput(newБараа.colors)
    const variants = parseVariantStockInput(newБараа.variantStock, colors, newБараа.sizeTemplate)

    if (!code || !name || price <= 0 || variants.length === 0) {
      alert('Бүтээгдэхүүний мэдээлэл болон variant үлдэгдэл-оо зөв бөглөнө үү.')
      return
    }

    if (products.some((product) => product.code === code)) {
      alert('Ийм кодтой бүтээгдэхүүн байна.')
      return
    }

    setБарааs([...products, { code, name, price, sizeTemplate: newБараа.sizeTemplate, colors, variants }])
    setActiveБарааCode(code)
    setNewБараа({ code: '', name: '', price: '', sizeTemplate: 'women-clothing', colors: '', variantStock: '' })
  }

  function parseComments() {
    const lines = commentPaste.split('\n').map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) return

    const availableStockByVariant = new Map(
      products.flatMap((product) =>
        product.variants.map((variant) => [variantKey(product.code, variant.color, variant.size), variant.үлдэгдэл] as const),
      ),
    )
    const newOrders: Order[] = []
    const newШалгахs: ШалгахItem[] = []
    let orderSequence = maxOrderNumber + 1
    const now = Date.now()

    lines.forEach((line) => {
      const codedБараа = findБарааInText(line, products)
      const product = codedБараа || (hasBuyKeyword(line) ? activeБараа : undefined)

      if (!product) {
        newШалгахs.push({
          id: makeId('COMMENT-REVIEW'),
          text: line,
          reason: 'Бүтээгдэхүүн тодорхойгүй байна',
          createdAt: now,
        })
        return
      }

      const colorResult = detectӨнгө(line, product)
      if (!colorResult.color) {
        newШалгахs.push({ id: makeId('COMMENT-REVIEW'), text: line, reason: colorResult.reason || 'Өнгө тодорхойгүй байна', createdAt: now })
        return
      }

      const sizeResult = detectРазмер(line, product)
      if (!sizeResult.size) {
        newШалгахs.push({ id: makeId('COMMENT-REVIEW'), text: line, reason: sizeResult.reason || 'Сайз тодорхойгүй байна', createdAt: now })
        return
      }

      const variant = findVariant(product, colorResult.color, sizeResult.size)
      if (!variant) {
        newШалгахs.push({ id: makeId('COMMENT-REVIEW'), text: line, reason: 'Ийм variant алга байна', createdAt: now })
        return
      }

      const quantity = extractQuantity(line, product.code)
      const key = variantKey(product.code, colorResult.color, sizeResult.size)
      const available = availableStockByVariant.get(key) || 0

      if (quantity > available) {
        newШалгахs.push({
          id: makeId('COMMENT-REVIEW'),
          text: line,
          reason: 'Үлдэгдэл хүрэлцэхгүй байна',
          createdAt: now,
        })
        return
      }

      availableStockByVariant.set(key, available - quantity)
      newOrders.push({
        id: nextOrderId(orderSequence++),
        buyerDisplayName: buyerFromComment(line),
        productCode: product.code,
        productName: product.name,
        color: colorResult.color,
        size: sizeResult.size,
        quantity,
        amount: product.price * quantity,
        status: 'Хүлээгдэж буй',
        sourceCommentText: line,
        createdAt: now,
        expiresAt: now + reservationTimeoutMinutes * 60 * 1000,
      })
    })

    setБарааs(products.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        үлдэгдэл: availableStockByVariant.get(variantKey(product.code, variant.color, variant.size)) ?? variant.үлдэгдэл,
      })),
    })))
    if (newOrders.length > 0) setOrders([...orders, ...newOrders])
    if (newШалгахs.length > 0) setUnclearComments([...newШалгахs, ...unclearComments])
    setCommentPaste('')
  }

  function markPaid(orderId: string, phone?: string) {
    const now = Date.now()
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId && order.status === 'Хүлээгдэж буй'
          ? { ...order, status: 'Төлсөн', paidAt: now, phone: phone || order.phone }
          : order,
      ),
    )
  }

  function cancelOrder(orderId: string) {
    const now = Date.now()
    const order = orders.find((item) => item.id === orderId)
    if (!order || order.status !== 'Хүлээгдэж буй') return

    setБарааs(products.map((product) =>
      product.code === order.productCode ? updateVariantStock(product, order.color, order.size, order.quantity) : product,
    ))

    setOrders(orders.map((item) =>
      item.id === orderId ? { ...item, status: 'Cancelled', cancelledAt: now } : item,
    ))
  }

  function parsePaymentEvents() {
    const lines = paymentPaste.split('\n').map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) return

    const now = Date.now()
    const successEvents: PaymentEvent[] = []
    const reviewEvents: PaymentEvent[] = []
    const paidOrderIdsWithPhone = new Map<string, string | undefined>()
    let workingOrders = [...orders]

    lines.forEach((line) => {
      const parsed = parsePaymentLine(line)
      const baseEvent = {
        rawText: line,
        amount: parsed.amount,
        productCode: parsed.productCode,
        buyerName: parsed.buyerName,
        phone: parsed.phone,
        createdAt: now,
      }
      const pending = workingOrders.filter((order) => order.status === 'Хүлээгдэж буй')
      const phoneCandidates = parsed.phone ? pending.filter((order) => order.phone === parsed.phone) : []
      const fuzzyCandidates = pending.filter((order) => isFuzzyBuyerMatch(order.buyerDisplayName, parsed.buyerName))
      const productCandidates = parsed.productCode ? pending.filter((order) => order.productCode.toUpperCase() === parsed.productCode?.toUpperCase()) : []
      const phoneExact = phoneCandidates.filter((order) => order.amount === parsed.amount)
      const phoneCombinations = findExactAmountCombinations(phoneCandidates.slice(0, 12), parsed.amount)
      const fuzzyExact = fuzzyCandidates.filter((order) => order.amount === parsed.amount)
      const fuzzyCombinations = findExactAmountCombinations(fuzzyCandidates.slice(0, 12), parsed.amount)
      const productExact = productCandidates.filter((order) => order.amount === parsed.amount)
      const allCombinations = [...phoneCombinations, ...fuzzyCombinations]
      const hasLatePaymentSignal = paymentWindow === '30 минут' && pending.length === 0

      if (phoneExact.length === 1) {
        const order = phoneExact[0]
        paidOrderIdsWithPhone.set(order.id, parsed.phone)
        workingOrders = workingOrders.map((item) => item.id === order.id && item.status === 'Хүлээгдэж буй' ? { ...item, status: 'Төлсөн', paidAt: now, phone: parsed.phone || item.phone } : item)
        successEvents.push({ id: makeId('PAYMENT-SUCCESS'), ...baseEvent, orderId: order.id, orderIds: [order.id], status: 'matched', matchType: 'phone_exact_amount', reason: `✅ ${order.id} төлөгдлөө — ${money(order.amount)}` })
        return
      }

      if (phoneExact.length === 0 && phoneCombinations.length === 1 && phoneCombinations[0].length > 1) {
        const matchedOrders = phoneCombinations[0]
        matchedOrders.forEach((order) => paidOrderIdsWithPhone.set(order.id, parsed.phone))
        const matchedIds = new Set(matchedOrders.map((order) => order.id))
        workingOrders = workingOrders.map((order) => matchedIds.has(order.id) && order.status === 'Хүлээгдэж буй' ? { ...order, status: 'Төлсөн', paidAt: now, phone: parsed.phone || order.phone } : order)
        successEvents.push({ id: makeId('PAYMENT-SUCCESS'), ...baseEvent, orderIds: matchedOrders.map((order) => order.id), status: 'combined_matched', matchType: 'phone_combined_exact_amount', reason: `✅ ${matchedOrders.length} захиалга нийлмэл төлбөрөөр таарлаа` })
        return
      }

      if (fuzzyExact.length === 1) {
        const order = fuzzyExact[0]
        paidOrderIdsWithPhone.set(order.id, parsed.phone)
        workingOrders = workingOrders.map((item) => item.id === order.id && item.status === 'Хүлээгдэж буй' ? { ...item, status: 'Төлсөн', paidAt: now, phone: parsed.phone || item.phone } : item)
        successEvents.push({ id: makeId('PAYMENT-SUCCESS'), ...baseEvent, orderId: order.id, orderIds: [order.id], status: 'matched', matchType: 'buyer_fuzzy_exact_amount', reason: `✅ ${order.id} төлөгдлөө — ${money(order.amount)}` })
        return
      }

      if (fuzzyExact.length === 0 && fuzzyCombinations.length === 1 && fuzzyCombinations[0].length > 1) {
        const matchedOrders = fuzzyCombinations[0]
        matchedOrders.forEach((order) => paidOrderIdsWithPhone.set(order.id, parsed.phone))
        const matchedIds = new Set(matchedOrders.map((order) => order.id))
        workingOrders = workingOrders.map((order) => matchedIds.has(order.id) && order.status === 'Хүлээгдэж буй' ? { ...order, status: 'Төлсөн', paidAt: now, phone: parsed.phone || order.phone } : order)
        successEvents.push({ id: makeId('PAYMENT-SUCCESS'), ...baseEvent, orderIds: matchedOrders.map((order) => order.id), status: 'combined_matched', matchType: 'buyer_fuzzy_combined_exact_amount', reason: `✅ ${matchedOrders.length} захиалга нийлмэл төлбөрөөр таарлаа` })
        return
      }

      if (productExact.length === 1) {
        const order = productExact[0]
        paidOrderIdsWithPhone.set(order.id, parsed.phone)
        workingOrders = workingOrders.map((item) => item.id === order.id && item.status === 'Хүлээгдэж буй' ? { ...item, status: 'Төлсөн', paidAt: now, phone: parsed.phone || item.phone } : item)
        successEvents.push({ id: makeId('PAYMENT-SUCCESS'), ...baseEvent, orderId: order.id, orderIds: [order.id], status: 'matched', matchType: 'product_code_exact_amount', reason: `✅ ${order.id} төлөгдлөө — ${money(order.amount)}` })
        return
      }

      const reviewCandidates = phoneCandidates.length > 0 ? phoneCandidates : fuzzyCandidates
      const pendingTotal = reviewCandidates.reduce((sum, order) => sum + order.amount, 0)
      let status: PaymentStatus = 'no_match'
      let reason = 'Тохирох pending захиалга олдсонгүй'
      if (hasLatePaymentSignal) { status = 'late_payment'; reason = 'Төлбөр хүлээх цонхоос хэтэрсэн байж болзошгүй' }
      else if (phoneExact.length > 1 || fuzzyExact.length > 1 || productExact.length > 1 || allCombinations.length > 1) { status = 'ambiguous'; reason = 'Олон боломжит таарсан захиалга олдлоо' }
      else if (reviewCandidates.length > 0 && typeof parsed.amount === 'number' && parsed.amount < pendingTotal) { status = 'underpaid'; reason = 'Төлбөр дутуу байна' }
      else if (reviewCandidates.length > 0 && typeof parsed.amount === 'number' && parsed.amount > pendingTotal) { status = 'overpaid'; reason = 'Төлбөр илүү байна' }
      reviewEvents.push({ id: makeId('PAYMENT-REVIEW'), ...baseEvent, status, matchType: 'review_required', reason, orderIds: reviewCandidates.map((o) => o.id) })
    })

    if (paidOrderIdsWithPhone.size > 0) {
      setOrders(orders.map((order) => {
        if (!paidOrderIdsWithPhone.has(order.id) || order.status !== 'Хүлээгдэж буй') return order
        return { ...order, status: 'Төлсөн', paidAt: now, phone: paidOrderIdsWithPhone.get(order.id) || order.phone }
      }))
    }
    if (successEvents.length > 0) setSuccessfulPaymentEvents([...successEvents, ...successfulPaymentEvents])
    if (reviewEvents.length > 0) setPaymentReviewEvents([...reviewEvents, ...paymentReviewEvents])
    setPaymentPaste('')
  }

  function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>) {
    const csvContent = "\uFEFF" + [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportOrdersCsv() {
    if (paidOrders.length === 0) {
      alert('Төлсөн захиалга алга байна.')
      return
    }

    const header = ['Захиалгын ID', 'Худалдан авагч', 'Утас', 'Барааны код', 'Барааны нэр', 'Өнгө', 'Размер', 'Тоо ширхэг', 'Дүн', 'Төлсөн огноо']
    const rows = paidOrders.map((order) => [
      order.id,
      order.buyerDisplayName,
      order.phone || '',
      order.productCode,
      order.productName,
      order.color,
      order.size,
      order.quantity,
      order.amount,
      dateTime(order.paidAt) || '',
    ])
    downloadCsv('borlo-orders.csv', header, rows)
  }

  function exportPackingCsv() {
    if (paidPackingOrders.length === 0) {
      alert('Одоогоор баглах төлсөн захиалга алга.')
      return
    }
    const header = ['Захиалгын дугаар', 'Худалдан авагч', 'Утас', 'Барааны код', 'Барааны нэр', 'Өнгө', 'Размер', 'Тоо', 'Дүн', 'Төлсөн цаг', 'Эх сурвалж коммент']
    const rows = paidPackingOrders.map((order) => [order.id, order.buyerDisplayName, order.phone || '', order.productCode, order.productName, order.color, order.size, order.quantity, order.amount, dateTime(order.paidAt) || '', order.sourceCommentText || ''])
    downloadCsv('borlo-packing-list.csv', header, rows)
  }

  function exportDeliveryCsv() {
    if (deliveryRows.length === 0) {
      alert('Одоогоор хүргэлтийн жагсаалт хоосон байна.')
      return
    }
    const header = ['Худалдан авагч', 'Утас', 'Хаяг', 'Төлсөн захиалга', 'Нийт дүн', 'Хүргэлтийн төлөв']
    const rows = deliveryRows.map((item) => [item.buyer, item.phone, item.address || 'Хаяг оруулаагүй', item.paidOrder, item.totalAmount, item.status])
    downloadCsv('borlo-delivery-list.csv', header, rows)
  }

  function exportPaymentReconciliationCsv() {
    const events = [...successfulPaymentEvents, ...paymentReviewEvents]
    if (events.length === 0) {
      alert('Төлбөрийн тулгалтын мэдээлэл алга.')
      return
    }
    const header = ['Төлөв', 'Дүн', 'Тайлбар', 'Order ID', 'Order IDs', 'Эх текст']
    const rows = events.map((item) => [item.status || '', item.amount || '', item.reason || '', item.orderId || '', item.orderIds?.join('|') || '', item.rawText || ''])
    downloadCsv('borlo-payment-reconciliation.csv', header, rows)
  }

  function exportDemandSummaryCsv() {
    if (variantInsights.length === 0) {
      alert('Эрэлтийн тайлангийн мэдээлэл алга.')
      return
    }
    const header = ['Барааны код', 'Барааны нэр', 'Өнгө', 'Размер', 'Төлсөн захиалга', 'Эрэлт оноо', 'Үлдэгдэл']
    const rows = variantInsights.map((item) => [item.productCode, item.productName, item.color, item.size, item.paidOrders, item.demandScore, item.availableStock])
    downloadCsv('borlo-demand-summary.csv', header, rows)
  }

  function resetDemo() {
    setБарааs(DEFAULT_PRODUCTS)
    setActiveБарааCode('A12')
    setOrders([])
    setUnclearComments([])
    setPaymentReviewEvents([])
    setSuccessfulPaymentEvents([])
    setCommentPaste('Болор: A12 хар M авъя')
    setPaymentPaste('89000 Болор A12 99112233\n239000 Болор 99112233\n70000 Болор 99112233\n500000 Болор 99112233\n88000 Бат 88119922')
    setPaymentRequestCopyStatus('') // Clear transient UI state
    setCopyStatus('') // Clear transient UI state
    setDemoResetFeedback('Demo data сэргээгдлээ'); // Set feedback
    window.setTimeout(() => setDemoResetFeedback(''), 2500); // Clear feedback
  }

  if (mode === 'landing') {
    return (
      <LandingPage
        onDemo={() => { setMode('dashboard'); window.location.hash = '#live' }}
        onDashboard={() => { setMode('dashboard'); window.location.hash = '#home' }}
      />
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <section id="home" className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <button onClick={() => setMode('landing')} className="text-sm font-semibold text-amber-300 hover:underline">Borlo</button>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">Лайв Захиалга Тулгагч</h1>
              <p className="mt-2 text-lg font-semibold text-white">Шууд борлуулалтын туслах</p>
              <p className="mt-3 max-w-2xl text-slate-200">Коммент → Захиалга → Төлбөр → Үлдэгдэл → Баглаа боодол → Жагсаалт</p>
              <p className="mt-4 inline-flex rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950">
                Туршилтын хувилбар — Facebook/QPay бодит холболт хийгдээгүй
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <a
                href="#trial"
                className="rounded-2xl bg-amber-300 px-5 py-4 text-center text-lg font-bold text-slate-950 shadow active:scale-95"
              >
                Анхны 2 live үнэгүй турших
              </a>
              <button onClick={resetDemo} className="rounded-2xl bg-white px-5 py-4 text-lg font-bold text-slate-950 shadow active:scale-95">
                Demo data сэргээх
              </button>
              {demoResetFeedback && (
                <p className="rounded-2xl bg-slate-200 p-2 text-center text-sm font-bold text-slate-700">
                  {demoResetFeedback}
                </p>
              )}
            </div>
          </div>
        </section>

        <nav className="rounded-3xl border bg-white/90 p-3 shadow-sm backdrop-blur">
          <div className="flex gap-2 overflow-x-auto text-sm font-bold text-slate-700">
            <a href="#home" className="whitespace-nowrap rounded-2xl bg-slate-950 px-4 py-2 text-white">Нүүр</a>
            <a href="#live" className="whitespace-nowrap rounded-2xl px-4 py-2 hover:bg-slate-100">Шууд дамжуулалт</a>
            <a href="#orders" className="whitespace-nowrap rounded-2xl px-4 py-2 hover:bg-slate-100">Захиалга</a>
            <a href="#payments" className="whitespace-nowrap rounded-2xl px-4 py-2 hover:bg-slate-100">Төлбөр</a>
            <a href="#products" className="whitespace-nowrap rounded-2xl px-4 py-2 hover:bg-slate-100">Бараа</a>
            <a href="#packing" className="whitespace-nowrap rounded-2xl px-4 py-2 hover:bg-slate-100">Баглаа боодол</a>
            <a href="#insights" className="whitespace-nowrap rounded-2xl px-4 py-2 hover:bg-slate-100">Тайлан</a>
          </div>
        </nav>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase text-amber-600">Лайвын урсгал</p>
              <h2 className="mt-2 text-2xl font-black">Лайв худалдаагаа нэг самбарт удирд</h2>
              <p className="mt-3 text-slate-700">
                Лайв дууссаны дараа хэн юу авсан, хэн төлсөн, ямар бараа дууссан,
                юуг баглах ёстой вэ гэдэг хамгийн их цаг авдаг.
              </p>
              <p className="mt-3 text-slate-700">
                Borlo энэ урсгалыг нэг самбарт цэгцэлнэ: коммент наахад захиалга үүснэ,
                төлбөрийн төлөв шинэчлэгдэнэ, үлдэгдэл хасагдана, төлөгдсөн захиалгууд баглаа боодлын жагсаалт дээр гарна.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl border bg-slate-50 p-4">
                <p className="text-lg font-black">Лайвын үеэр</p>
                <p className="mt-2 text-sm text-slate-600">
                  Лайв коммент наахад барааны код, өнгө, размер, тоо ширхэгээр хүлээгдэж буй захиалга үүсгэнэ.
                </p>
              </div>
              <div className="rounded-3xl border bg-slate-50 p-4">
                <p className="text-lg font-black">Төлбөр шалгах үед</p>
                <p className="mt-2 text-sm text-slate-600">
                  Гараар “Төлсөн” гэж тэмдэглэх эсвэл Auto туршилт дээр төлбөрийн мэдээлэл нааж тааруулалт шалгана.
                </p>
              </div>
              <div className="rounded-3xl border bg-slate-50 p-4">
                <p className="text-lg font-black">Лайв дууссаны дараа</p>
                <p className="mt-2 text-sm text-slate-600">
                  Төлөгдсөн захиалгууд баглаа боодлын жагсаалт дээр гарч, Захиалга CSV татахад бэлэн болно.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">Хүлээгдэж буй</p>
            <p className="mt-2 text-3xl font-black sm:text-4xl">{pendingOrders.length}</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">Төлсөн / Баглах</p>
            <p className="mt-2 text-3xl font-black sm:text-4xl">{paidOrders.length}</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">Орлого</p>
            <p className="mt-2 text-3xl font-black sm:text-4xl">{money(revenue)}</p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-bold uppercase text-amber-600">Нэг удаагийн тохиргоо</p>
          <h2 className="mt-2 text-xl font-black sm:text-2xl">Эхний лайваа эхлүүлэх checklist</h2>
          <p className="mt-2 text-sm font-semibold text-slate-700 sm:text-base">Тохиргоо: 3/5 бэлэн (demo явц)</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              ['1. Facebook Page-ээ холбоно', 'Лайвын сэтгэгдэл автоматаар орж ирэхэд бэлэн болно.'],
              ['2. Gmail орлогын мэдээгээ тохируулна', 'Банкны API хэрэггүй. Орлогын мэдэгдлээр төлбөр тулгана.'],
              ['3. Бараа, өнгө, размер, үлдэгдлээ оруулна', 'Захиалга үүсэхэд үлдэгдэл автоматаар хадгалагдана.'],
              ['4. Лайваа Facebook Page дээрээ эхлүүлнэ', 'Borlo дээр Active Live хайж сонгоно.'],
              ['5. Лайв дуусгаад тайлангаа харна', 'Төлбөр, баглаа боодол, алдсан эрэлт, дараагийн лайвын зөвлөмж гарна.'],
            ].map((step) => (
              <div key={step[0]} className="rounded-2xl border bg-slate-50 p-4">
                <p className="font-black">{step[0]}</p>
                <p className="mt-2 text-sm text-slate-600">{step[1]}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="#facebook-live" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">Facebook холболт</a>
            <a href="#payments" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">Төлбөр тохируулах</a>
            <a href="#products" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">Бараа нэмэх</a>
            <button
              type="button"
              onClick={() => {
                setFacebookConnectionState('live-found')
                document.getElementById('facebook-live')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white"
            >
              Active live хайх
            </button>
            <button
              type="button"
              onClick={() => {
                setLiveFinished(true)
                document.getElementById('insights')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white"
            >
              Лайв дуусгах
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-black text-amber-900">Тохиргоо хийхэд тусламж хэрэгтэй юу?</p>
            <p className="mt-2 text-sm text-amber-900">Facebook Page болон Gmail орлогын мэдээний тохиргоог нэг удаа хийвэл дараагийн лайв бүр дээр Borlo таны сэтгэгдэл, төлбөр, үлдэгдэл, баглаа боодлыг цэгцэлнэ.</p>
          </div>
        </section>

        <section id="facebook-live" className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Facebook Page Live холболт</h2>
          <p className="mt-2 text-slate-700">Borlo-г нэг удаа Facebook Page-тэйгээ холбоход лайвын сэтгэгдэл автоматаар орж ирнэ. Энэ нь seller trial-ийн үндсэн урсгал.</p>
          <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Setup required: Meta credential энэ demo орчинд холбогдоогүй. Доорх төлөвүүд нь demo simulation.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold" onClick={() => setFacebookConnectionState('not-connected')}>Not connected</button>
            <button className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold" onClick={() => setFacebookConnectionState('connected')}>Connected</button>
            <button className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold" onClick={() => setFacebookConnectionState('live-found')}>Active live found</button>
            <button className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold" onClick={() => setFacebookConnectionState('importing')}>Importing</button>
          </div>
          <div className="mt-4 rounded-2xl border p-4">
            {facebookConnectionState === 'not-connected' && <button className="rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white">Facebook Page холбох</button>}
            {facebookConnectionState === 'connected' && <div className="space-y-3"><p className="font-bold">Холбогдсон page: Borlo Seller Demo Page</p><div className="flex gap-2"><button className="rounded-xl bg-slate-950 px-3 py-2 text-white">Active Live хайх</button><button className="rounded-xl bg-slate-100 px-3 py-2 font-bold">Live link оруулах</button></div></div>}
            {facebookConnectionState === 'live-found' && <div className="space-y-3"><p className="font-bold">Live: Friday New Arrivals Live — 2026-05-05 19:00</p><button className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">Сэтгэгдэл татаж эхлэх</button></div>}
            {facebookConnectionState === 'importing' && <div className="grid gap-2 sm:grid-cols-4">{[['Нийт сэтгэгдэл','326'],['Захиалга илэрсэн','88'],['Ignore','17'],['Review','9']].map((s)=><div key={s[0]} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{s[0]}</p><p className="text-2xl font-black">{s[1]}</p></div>)}</div>}
          </div>
          <p className="mt-3 text-sm text-slate-600">Одоогоор Facebook Page live дэмжинэ. Хувийн profile, group live, TikTok, Instagram Live одоогоор дэмжихгүй.</p>
          <p className="mt-2 text-sm text-slate-500">Emergency backup: шаардлагатай үед manual comment import ашиглаж болно (үндсэн урсгал биш).</p>
        </section>

        {activeБараа && (
          <section id="live" className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-bold uppercase text-emerald-700">Идэвхтэй бараа</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <div><p className="text-xs text-slate-500">Код</p><p className="text-2xl font-black">{activeБараа.code}</p></div>
              <div><p className="text-xs text-slate-500">Нэр</p><p className="text-2xl font-black">{activeБараа.name}</p></div>
              <div><p className="text-xs text-slate-500">Үнэ</p><p className="text-2xl font-black">{money(activeБараа.price)}</p></div>
              <div><p className="text-xs text-slate-500">Үлдэгдэл</p><p className="text-2xl font-black">{totalStock(activeБараа)}</p></div>
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Туршилт авах хүсэлт</h2>
          <p className="mt-2 text-slate-700">Анхны 2 live дээр Borlo-г туршиж үзээд, коммент → захиалга → төлбөр → үлдэгдэл → баглаа боодлын жагсаалт урсгалыг шалгаарай.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
                className="rounded-2xl border p-4 sm:col-span-2"
                placeholder="Facebook page / лайв хаяг"
                value={trialLead.facebook}
                onChange={(e) => setTrialLead({ ...trialLead, facebook: e.target.value })}
              />
            <input
                className="rounded-2xl border p-4"
                placeholder="Утас"
                type="tel"
                value={trialLead.phone}
                onChange={(e) => setTrialLead({ ...trialLead, phone: e.target.value })}
              />
            <input
                className="rounded-2xl border p-4"
                placeholder="Гол зардаг бараа"
                value={trialLead.product}
                onChange={(e) => setTrialLead({ ...trialLead, product: e.target.value })}
              />
            <input
                className="rounded-2xl border p-4 sm:col-span-2"
                placeholder="Сард хэдэн live хийдэг вэ?"
                value={trialLead.liveCount}
                onChange={(e) => setTrialLead({ ...trialLead, liveCount: e.target.value })}
              />
            <p className="sm:col-span-2 text-lg font-bold text-slate-950">Сонирхож буй хувилбар:</p>
            <label className="flex items-center space-x-2 sm:col-span-2">
              <input type="radio" name="plan" className="form-radio" />
              <span>Basic 99,000₮</span>
            </label>
            <label className="flex items-center space-x-2 sm:col-span-2">
              <input type="radio" name="plan" className="form-radio" />
              <span>Auto 149,000₮ + 1%</span>
            </label>
            <label className="flex items-center space-x-2 sm:col-span-2">
              <input type="radio" name="plan" className="form-radio" defaultChecked />
              <span>Эхлээд үнэгүй туршъя</span>
            </label>
            <button className="rounded-2xl bg-blue-600 px-5 py-4 text-lg font-bold text-white sm:col-span-2">Demo авах</button>
          </div>
          <p className="mt-4 text-sm text-slate-500 text-center">Одоогоор туршилтын form — илгээх backend холбогдоогүй.</p>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase text-amber-600">Анхны 2 live үнэгүй</p>
              <h2 className="mt-2 text-2xl font-black">Туршилт авах хүсэлт</h2>
              <p className="mt-3 text-slate-700">
                Анхны 2 live дээр Borlo-г туршиж үзээд, коммент → захиалга → төлбөр → үлдэгдэл → баглаа боодлын жагсаалт урсгалыг шалгаарай.
              </p>
              <p className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                Одоогоор туршилтын form — илгээх backend холбогдоогүй.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input className="rounded-2xl border p-4 sm:col-span-2" placeholder="Facebook page / лайв хаяг" />
              <input className="rounded-2xl border p-4" placeholder="Утас" type="tel" />
              <input className="rounded-2xl border p-4" placeholder="Гол зардаг бараа" />
              <input className="rounded-2xl border p-4 sm:col-span-2" placeholder="Сард хэдэн live хийдэг вэ?" />

              <div className="rounded-2xl border p-4 sm:col-span-2">
                <p className="font-bold text-slate-950">Сонирхож буй хувилбар</p>
                <div className="mt-3 grid gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="trial-plan"
                      checked={trialLead.plan === 'Basic 99,000₮'}
                      onChange={() => setTrialLead({ ...trialLead, plan: 'Basic 99,000₮' })}
                    />
                    <span>Basic 99,000₮</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="trial-plan"
                      checked={trialLead.plan === 'Auto 149,000₮ + 1%'}
                      onChange={() => setTrialLead({ ...trialLead, plan: 'Auto 149,000₮ + 1%' })}
                    />
                    <span>Auto 149,000₮ + 1%</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="trial-plan"
                      checked={trialLead.plan === 'Эхлээд үнэгүй туршъя'}
                      onChange={() => setTrialLead({ ...trialLead, plan: 'Эхлээд үнэгүй туршъя' })}
                    />
                    <span>Эхлээд үнэгүй туршъя</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const demoRequestText = [
                    'Сайн байна уу. Borlo-г анхны 2 live дээр туршиж үзмээр байна.',
                    '',
                    `Facebook/live хаяг: ${trialLead.facebook || '[энд бичнэ]'} `,
                    `Утас: ${trialLead.phone || '[энд бичнэ]'} `,
                    `Гол зардаг бараа: ${trialLead.product || '[энд бичнэ]'} `,
                    `Сард хийх live: ${trialLead.liveCount || '[энд бичнэ]'} `,
                    `Сонирхож буй хувилбар: ${trialLead.plan} `,
                  ].join('\n')
                  navigator.clipboard.writeText(demoRequestText)
                  setCopyStatus('Хууллаа — Messenger/Telegram рүү paste хийгээрэй')
                  window.setTimeout(() => setCopyStatus(''), 2500)
                }}
                className="rounded-2xl bg-slate-950 px-5 py-4 text-lg font-bold text-white shadow active:scale-95 sm:col-span-2"
              >
                Demo хүсэлтийн текст хуулах
              </button>
              {copyStatus && (
                <p className="rounded-2xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-700 sm:col-span-2">
                  {copyStatus}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase text-amber-300">Холбогдох сувгууд</p>
              <h2 className="mt-2 text-2xl font-black">Туршилт авахад ойрхон байна</h2>
              <p className="mt-3 text-slate-300">
                Facebook page эсвэл live хаягаа явуулбал таны одоогийн захиалга авах урсгалд Borlo хэрхэн таарахыг шалгаж өгнө.
              </p>
              <p className="mt-3 text-sm text-slate-400">
                Одоогоор эдгээр нь туршилтын товчнууд — бодит chatbot/API холболт дараагийн шатанд нэмэгдэнэ.
              </p>
              <p className="mt-3 rounded-2xl bg-white/10 p-3 text-sm font-semibold text-slate-200">
                Эхлээд demo хүсэлтийн текстээ хуулж аваад Messenger эсвэл Telegram рүү paste хийгээрэй.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-5">
              <a href={SOCIAL_LINKS.facebook} className="rounded-2xl bg-white px-4 py-3 text-center font-bold text-slate-950 shadow active:scale-95">Facebook</a>
              <a href={SOCIAL_LINKS.instagram} className="rounded-2xl bg-white px-4 py-3 text-center font-bold text-slate-950 shadow active:scale-95">Instagram</a>
              <a href={SOCIAL_LINKS.tiktok} className="rounded-2xl bg-white px-4 py-3 text-center font-bold text-slate-950 shadow active:scale-95">TikTok</a>
              <a href={SOCIAL_LINKS.messenger} className="rounded-2xl bg-amber-300 px-4 py-3 text-center font-bold text-slate-950 shadow active:scale-95">Messenger</a>
              <a href={SOCIAL_LINKS.telegram} className="rounded-2xl bg-white px-4 py-3 text-center font-bold text-slate-950 shadow active:scale-95">Telegram</a>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase text-amber-600">Анхааруулга</p>
              <h2 className="mt-2 text-2xl font-black">Анхаарах худалдан авагч</h2>
              <p className="mt-3 text-slate-700">
                Дараагийн шатанд Borlo өмнө нь захиалга аваад авахгүй алга болсон,
                төлбөр дутуу хийсэн, эсвэл олон удаа цуцалсан худалдан авагчийг анхааруулдаг болно.
              </p>
            </div>

            <div className="rounded-3xl border bg-amber-50 p-4">
              <p className="font-bold text-amber-800">Туршилтын сануулга</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="font-bold">Мөнхөө — 9900****</p>
                  <p className="mt-1 text-slate-600">
                    Өмнөх live дээр 2 захиалга цуцалсан. Төлбөр баталгаажтал бараа хадгалахгүй.
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="font-bold">Нараа — 8811****</p>
                  <p className="mt-1 text-slate-600">
                    Баглаа боодолд орсон захиалгаа авахгүй буцаасан. Шалгаж баталгаажуулах шаардлагатай.
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-amber-700">
                Одоогоор demo мэдээлэл — бодит blacklist/database холболт дараагийн шатанд нэмэгдэнэ.
              </p>
            </div>
          </div>
        </section>


        <section id="insights" className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-2xl font-black">Тайлан</h2>

          <div className="mb-4 rounded-2xl bg-slate-50 p-4">
            <h3 className="mb-2 text-lg font-black">Өнөөдрийн үзүүлэлт</h3>
            <div className="grid gap-2 text-center sm:grid-cols-5">
              <div>
                <p className="text-sm text-slate-500">Коммент</p>
                <p className="text-xl font-bold">{todayMetrics.commentMentions}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Захиалга</p>
                <p className="text-xl font-bold">{todayMetrics.successfulOrders}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Төлсөн</p>
                <p className="text-xl font-bold">{todayMetrics.paidOrders}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Хүрэлцээгүй</p>
                <p className="text-xl font-bold">{todayMetrics.outOfStockRequests}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Шалгах</p>
                <p className="text-xl font-bold">{todayMetrics.reviewCount}</p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="mb-2 text-lg font-black">Эрэлттэй бараа</h3>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-1">Бараа</th>
                    <th className="px-2 py-1">Коммент</th>
                    <th className="px-2 py-1">Захиалга</th>
                    <th className="px-2 py-1">Төлсөн</th>
                    <th className="px-2 py-1">Хүрэлцээгүй</th>
                    <th className="px-2 py-1">Шалгах</th>
                    <th className="px-2 py-1 text-right">Demand</th>
                  </tr>
                </thead>
                <tbody>
                  {productInsights.map((item) => (
                    <tr key={item.code} className="border-b">
                      <td className="whitespace-nowrap px-2 py-1">{item.code} — {item.name}</td>
                      <td className="px-2 py-1 text-center">{item.commentMentions}</td>
                      <td className="px-2 py-1 text-center">{item.successfulOrders}</td>
                      <td className="px-2 py-1 text-center">{item.paidOrders}</td>
                      <td className="px-2 py-1 text-center">{item.outOfStockRequests}</td>
                      <td className="px-2 py-1 text-center">{item.reviewCount}</td>
                      <td className="px-2 py-1 text-right font-bold">{item.demandScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="mb-2 text-lg font-black">Эрэлттэй variant</h3>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-1">Бараа</th>
                    <th className="px-2 py-1">Өнгө</th>
                    <th className="px-2 py-1">Сайз</th>
                    <th className="px-2 py-1">Коммент</th>
                    <th className="px-2 py-1">Захиалга</th>
                    <th className="px-2 py-1">Төлсөн</th>
                    <th className="px-2 py-1">Хүрэлцээгүй</th>
                    <th className="px-2 py-1">Шалгах</th>
                    <th className="px-2 py-1 text-right">Demand</th>
                  </tr>
                </thead>
                <tbody>
                  {variantInsights.map((item) => (
                    <tr key={item.key} className="border-b">
                      <td className="px-2 py-1">{item.productCode}</td>
                      <td className="px-2 py-1 text-center">{item.color}</td>
                      <td className="px-2 py-1 text-center">{item.size}</td>
                      <td className="px-2 py-1 text-center">{item.commentMentions}</td>
                      <td className="px-2 py-1 text-center">{item.successfulOrders}</td>
                      <td className="px-2 py-1 text-center">{item.paidOrders}</td>
                      <td className="px-2 py-1 text-center">{item.outOfStockRequests}</td>
                      <td className="px-2 py-1 text-center">{item.reviewCount}</td>
                      <td className="px-2 py-1 text-right font-bold">{item.demandScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-lg font-black">Хүрэлцээгүй эрэлт</h3>
              <ul className="space-y-2">
                {outOfStockList.length === 0 && <li className="text-sm text-slate-500">Одоогоор хүрэлцээгүй эрэлт алга.</li>}
                {outOfStockList.map((item) => (
                  <li key={item.code} className="rounded-2xl bg-rose-50 p-3 text-rose-800">
                    {item.code} — {item.name}: {item.outOfStockRequests} удаа
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-black">Дахин нөөцлөх санал</h3>
              <ul className="space-y-2">
                {restockSuggestions.length === 0 && <li className="text-sm text-slate-500">Одоогоор дахин нөөцлөх санал алга.</li>}
                {restockSuggestions.map((item) => (
                  <li key={item.code} className="rounded-2xl bg-amber-50 p-3 text-amber-800">
                    {item.code} — {item.name}: үлдэгдэл {item.availableStock}, Demand {item.demandScore}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-black">Дараагийн лайвын санал</h3>
              <ul className="space-y-2">
                {nextLiveSuggestions.length === 0 && <li className="text-sm text-slate-500">Одоогоор санал алга.</li>}
                {nextLiveSuggestions.map((item) => (
                  <li key={item.key} className="rounded-2xl bg-blue-50 p-3 text-blue-800">
                    {item.productCode} — {item.color}/{item.size}: Demand {item.demandScore}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-black">Нөөц дуусах гэж байна</h3>
              <ul className="space-y-2">
                {lowStockWarnings.length === 0 && <li className="text-sm text-slate-500">Одоогоор нөөц дуусах гэж буй variant алга.</li>}
                {lowStockWarnings.map((item) => (
                  <li key={item.key} className="rounded-2xl bg-amber-100 p-3 text-amber-800">
                    {item.productCode} — {item.color}/{item.size}: үлдэгдэл {item.availableStock}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="owner-admin" className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Owner/Admin Demo Dashboard</p>
              <h2 className="text-2xl font-black">Эзэмшигчийн demo самбар</h2>
              <p className="mt-1 text-sm text-slate-300">
                Demo-only operator view. Бодит seller database, CRM, payment integration, login/auth холбогдоогүй.
              </p>
            </div>
            <span className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-emerald-200">
              Local demo metrics only
            </span>
          </div>

          {(() => {
            const demoSellers = [
              {
                seller: 'Saraa Live Fashion',
                plan: 'Trial',
                status: 'Follow-up хэрэгтэй',
                livesPerMonth: 12,
                orders: orders.length,
                reviewCount: paymentReviewEvents.length,
                nextFollowUp: '2026-05-06',
                notes: 'Анхны 2 live үнэгүй туршуулах',
              },
              {
                seller: 'Nomin Kids Shop',
                plan: 'Basic',
                status: 'Active',
                livesPerMonth: 18,
                orders: Math.max(8, paidOrders.length + pendingOrders.length),
                reviewCount: Math.max(1, paymentReviewEvents.length),
                nextFollowUp: '2026-05-08',
                notes: 'Packing list болон stock flow сонирхож байгаа',
              },
              {
                seller: 'Bolor Shoes',
                plan: 'Auto',
                status: 'Demo request',
                livesPerMonth: 20,
                orders: Math.max(12, orders.length + 4),
                reviewCount: Math.max(2, paymentReviewEvents.length + 1),
                nextFollowUp: '2026-05-10',
                notes: 'Simulated payment matching demo үзүүлэх',
              },
            ]

            const totalSellers = demoSellers.length
            const demoRequests = demoSellers.filter((seller) => seller.status === 'Demo request').length + 1
            const trialSellers = demoSellers.filter((seller) => seller.plan === 'Trial').length
            const basicSellers = demoSellers.filter((seller) => seller.plan === 'Basic').length
            const autoSellers = demoSellers.filter((seller) => seller.plan === 'Auto').length
            const activeSellers = demoSellers.filter((seller) => seller.status === 'Active').length
            const monthlyRevenueEstimate = basicSellers * 99000 + autoSellers * 149000
            const totalOrders = demoSellers.reduce((sum, seller) => sum + seller.orders, 0)
            const paymentReviewVolume = demoSellers.reduce((sum, seller) => sum + seller.reviewCount, 0)
            const followUpNeeded = demoSellers.filter((seller) => seller.status.includes('Follow-up') || seller.status === 'Demo request').length

            const adminCards = [
              ['Total sellers', totalSellers],
              ['Demo хүсэлт', demoRequests],
              ['Trial seller', trialSellers],
              ['Basic seller', basicSellers],
              ['Auto seller', autoSellers],
              ['Active seller', activeSellers],
              ['Monthly revenue', money(monthlyRevenueEstimate)],
              ['Нийт захиалга', totalOrders],
              ['Payment Review', paymentReviewVolume],
              ['Follow-up', followUpNeeded],
            ]

            return (
              <>
                <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {adminCards.map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-1 text-2xl font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mb-4 rounded-2xl bg-white/10 p-4">
                  <h3 className="mb-2 text-lg font-black">Usage report</h3>
                  <div className="grid gap-2 text-sm text-slate-200 md:grid-cols-3">
                    <p>Live/month estimate: <strong>{demoSellers.reduce((sum, seller) => sum + seller.livesPerMonth, 0)}</strong></p>
                    <p>Payment review ratio: <strong>{totalOrders ? Math.round((paymentReviewVolume / totalOrders) * 100) : 0}%</strong></p>
                    <p>Follow-up status: <strong>{followUpNeeded} seller</strong></p>
                  </div>
                </div>

                <div className="overflow-auto rounded-2xl bg-white text-slate-900">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-100 text-left">
                        <th className="px-3 py-2">Seller</th>
                        <th className="px-3 py-2">Plan</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Lives/month</th>
                        <th className="px-3 py-2">Orders</th>
                        <th className="px-3 py-2">Review count</th>
                        <th className="px-3 py-2">Next follow-up</th>
                        <th className="px-3 py-2">Seller notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demoSellers.map((seller) => (
                        <tr key={seller.seller} className="border-b">
                          <td className="whitespace-nowrap px-3 py-2 font-bold">{seller.seller}</td>
                          <td className="px-3 py-2">{seller.plan}</td>
                          <td className="px-3 py-2">{seller.status}</td>
                          <td className="px-3 py-2 text-center">{seller.livesPerMonth}</td>
                          <td className="px-3 py-2 text-center">{seller.orders}</td>
                          <td className="px-3 py-2 text-center">{seller.reviewCount}</td>
                          <td className="whitespace-nowrap px-3 py-2">{seller.nextFollowUp}</td>
                          <td className="min-w-64 px-3 py-2">{seller.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          })()}
        </section>

        <section id="reservation-settings" className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black">Захиалгын хугацаа</h2>
              <p className="text-sm text-slate-500">
                Pending захиалга хэдэн минут нөөцтэй байхыг сонгоно. Шинэ захиалгад энэ тохиргоо үйлчилнэ.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-2xl border px-3 py-2 text-sm"
                value={RESERVATION_TIMEOUT_OPTIONS.includes(reservationTimeoutMinutes as any) ? reservationTimeoutMinutes : 'custom'}
                onChange={(event) => setReservationTimeoutFromInput(event.target.value)}
              >
                <option value={10}>10 минут</option>
                <option value={15}>15 минут</option>
                <option value={20}>20 минут</option>
                <option value={30}>30 минут</option>
                <option value={60}>60 минут</option>
                <option value="custom">Custom</option>
              </select>

              <input
                className="w-28 rounded-2xl border px-3 py-2 text-sm"
                type="number"
                min="1"
                value={customReservationTimeout}
                onChange={(event) => setCustomReservationTimeout(event.target.value)}
                onBlur={() => setReservationTimeoutFromInput('custom')}
                placeholder="Минут"
              />

              <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold">
                Одоо: {reservationTimeoutMinutes} минут
              </span>
            </div>
          </div>
        </section>

        <section id="products" className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Бүтээгдэхүүн</h2>
            <div className="mt-4 space-y-3">
              {products.map((product) => (
                <div key={product.code} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xl font-black">{product.code} — {product.name}</p>
                      <p className="text-slate-600">{money(product.price)} • үлдэгдэл {totalStock(product)} • {SIZE_TEMPLATE_LABELS[product.sizeTemplate]}</p>
                      <p className="mt-1 text-sm text-slate-500">Өнгө: {product.colors.join(', ')}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {product.variants.map((variant) => `${variant.color}/${variant.size}: ${variant.үлдэгдэл}`).join(' • ')}
                      </p>
                    </div>
                    <button onClick={() => setActiveБарааCode(product.code)} className={`rounded-2xl px-5 py-3 font-bold ${activeБарааCode === product.code ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                      {activeБарааCode === product.code ? 'Active' : 'Active болгох'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input className="rounded-2xl border p-4" placeholder="Код: C03" value={newБараа.code} onChange={(e) => setNewБараа({ ...newБараа, code: e.target.value })} />
              <input className="rounded-2xl border p-4" placeholder="Нэр" value={newБараа.name} onChange={(e) => setNewБараа({ ...newБараа, name: e.target.value })} />
              <input className="rounded-2xl border p-4" placeholder="Үнэ" type="number" value={newБараа.price} onChange={(e) => setNewБараа({ ...newБараа, price: e.target.value })} />
              <select className="rounded-2xl border p-4" value={newБараа.sizeTemplate} onChange={(e) => setNewБараа({ ...newБараа, sizeTemplate: e.target.value as РазмерTemplate })}>
                {SELLER_SIZE_TEMPLATE_OPTIONS.map((template) => (
                  <option key={template} value={template}>{SIZE_TEMPLATE_LABELS[template]}</option>
                ))}
              </select>
              <input className="rounded-2xl border p-4 sm:col-span-2" placeholder="Өнгө: Хар, Улаан, Цагаан" value={newБараа.colors} onChange={(e) => setNewБараа({ ...newБараа, colors: e.target.value })} />
              <textarea className="min-h-24 rounded-2xl border p-4 sm:col-span-2" placeholder="Үлдэгдэл: Хар/S:1, Хар/M:2, Улаан/L:2" value={newБараа.variantStock} onChange={(e) => setNewБараа({ ...newБараа, variantStock: e.target.value })} />
              <button onClick={addБараа} className="rounded-2xl bg-slate-950 px-5 py-4 text-lg font-bold text-white sm:col-span-2">Бүтээгдэхүүн нэмэх</button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 id="orders" className="text-2xl font-black">Emergency backup: Лайв коммент гараар оруулах</h2>
            <p className="mt-1 text-sm text-slate-500">Үндсэн урсгал нь Facebook Page Live холболт. Энэ хэсэг нь зөвхөн backup зориулалттай.</p>
            <p className="mt-1 text-sm text-slate-500">Жишээ: Болор: A12 хар M авъя • Сараа: A12 хар 3XL авъя • Номин: C01 цагаан 42 авъя • E01 цагаан 28 авъя • F01 хар 32 2ш</p>
            <textarea className="mt-4 min-h-44 w-full rounded-2xl border p-4 text-base" value={commentPaste} onChange={(e) => setCommentPaste(e.target.value)} />
            <button onClick={parseComments} className="mt-3 w-full rounded-2xl bg-blue-600 px-5 py-4 text-lg font-bold text-white">Backup комментоос захиалга үүсгэх</button>
          </div>
        </section>

        <section id="payments" className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Gmail орлогын мэдээ тулгалт</h2>
          <p className="mt-2 text-slate-700">Банкны орлогын мэдэгдлээ Gmail рүү нэг удаа тохируулбал Borlo лайвын төлбөрүүдийг захиалгатай тулгана.</p>
          <p className="mt-2 text-sm text-slate-700">Borlo таны бүх Gmail-ийг уншихгүй. Зөвхөн таны зөвшөөрсөн банкны орлогын мэдэгдлийг тухайн лайвын хугацаа болон төлбөр хүлээх цонхоор шалгана.</p>
          <p className="mt-1 text-sm font-bold text-emerald-700">Банкны API шаардлагагүй.</p>
          <p className="mt-1 text-sm text-amber-700">Тохиргоо шаардлагатай demo төлөв: Gmail OAuth энэ орчинд бодитоор холбогдоогүй.</p>
          <div className="mt-3">
            <p className="text-sm font-bold">Төлбөр хүлээх цонх</p>
            <select value={paymentWindow} onChange={(e) => setPaymentWindow(e.target.value)} className="mt-2 rounded-xl border p-2">
              {['30 минут', '1 цаг', '2 цаг', 'Маргааш 12:00 хүртэл'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {['Таарсан', 'Нийлмэл төлбөр таарсан', 'Дутуу төлөлт', 'Илүү төлөлт', 'Олон боломжит таарсан', 'Таараагүй төлбөр', 'Хоцорсон төлбөр'].map((s) => <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{s}</span>)}
          </div>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Би лайв борлуулалтдаа ашигладаг банкны данстай.</li><li>Тухайн дансны орлогын мэдэгдэл Gmail рүү ирдэг.</li><li>Мэдэгдэл дотор дүн, огноо, гүйлгээний утга харагддаг.</li><li>Borlo зөвхөн лайвын хугацаан дахь орлогын мэдээг уншихыг зөвшөөрнө.</li><li>Лайв дууссаны дараа банкны хуулга upload хийж баталгаажуулж болно.</li>
          </ul>
          <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm font-semibold">Видео зааврын placeholder: “Банкны орлогын мэдэгдлээ Gmail рүү хэрхэн авах вэ?”</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {['ХААН Банк', 'Голомт Банк', 'TDB', 'ХасБанк', 'Төрийн Банк'].map((bank) => <div key={bank} className="rounded-xl border p-3 text-sm"><p className="font-bold">{bank}</p><p className="text-slate-500">Guide coming soon</p></div>)}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Банкны хуулга upload хийх</h2>
          <p className="mt-2 text-slate-700">Лайв дууссаны дараах эцсийн тулгалт хийхэд ашиглана (demo CSV/XLSX мөр дэмжинэ).</p>
          <p className="mt-1 text-sm text-slate-500">PDF/image OCR — future support placeholder.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {['Bank statement confirmed', 'Gmail notice missed', 'Late payment found', 'Review resolved', 'Still unmatched'].map((s) => <div key={s} className="rounded-xl bg-slate-50 p-3 text-sm font-semibold">{s}</div>)}
          </div>

          <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
            <h3 className="text-lg font-black">Баглах товч нэгтгэл</h3>
            <div className="mt-2 space-y-2 text-sm">
              {packingGroups.map((item) => (
                <p key={`${item.productCode}-${item.color}-${item.size}`}>{item.productCode} / {item.productName} / {item.color} / {item.size} — {item.totalQuantity} ширхэг — {item.buyers.size} худалдан авагч</p>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-white p-4">
            <h3 className="text-lg font-black">Хүргэлтийн жагсаалт</h3>
            {deliveryRows.length === 0 && <p className="mt-2 text-slate-500">Одоогоор хүргэлтийн жагсаалт хоосон байна.</p>}
            <div className="mt-3 space-y-2">
              {deliveryRows.map((item) => (
                <div key={`${item.paidOrder}-${item.buyer}`} className="rounded-xl border p-3 text-sm">
                  <p>Худалдан авагч: <b>{item.buyer}</b></p>
                  <p>Утас: <b>{item.phone || '-'}</b></p>
                  <p>Төлсөн захиалга: <b>{item.paidOrder}</b></p>
                  <p>Нийт дүн: <b>{money(item.totalAmount)}</b></p>
                  <p>Хаяг: <b>{item.address || 'Хаяг оруулаагүй'}</b></p>
                  <p>Төлөв: <b>{item.phone ? 'Хүргэлт бэлдэх' : 'Хаяг дутуу'}</b></p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Хүлээгдэж буй захиалга</h2>
            <div className="mt-4 space-y-3">
              {pendingOrders.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">Одоогоор хүлээгдэж буй захиалга алга. Коммент paste хийж захиалга үүсгэнэ.</p>}
              {pendingOrders.map((order, index) => (
                <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xl font-black">#{index + 1} {order.buyerDisplayName}</p>
                      <p className="text-slate-600">{order.productCode} {order.productName} • {order.color} / {order.size} × {order.quantity}</p>
                      <p className="font-bold">{money(order.amount)}</p>
                      <p className="text-xs text-slate-500">Захиалсан: {new Date(order.createdAt).toLocaleTimeString('mn-MN', {hour: '2-digit', minute:'2-digit'})} • Дуусах: {dateTime(order.expiresAt)}</p>
                      {order.status === 'Хүлээгдэж буй' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold hover:bg-slate-200"
                            type="button"
                            onClick={() => extendReservation(order.id, 10)}
                          >
                            +10 мин
                          </button>
                          <button
                            className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold hover:bg-slate-200"
                            type="button"
                            onClick={() => extendReservation(order.id, 15)}
                          >
                            +15 мин
                          </button>
                          <button
                            className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold hover:bg-slate-200"
                            type="button"
                            onClick={() => extendReservation(order.id, 30)}
                          >
                            +30 мин
                          </button>
                          <button
                            className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                            type="button"
                            onClick={() => releasePendingOrder(order)}
                          >
                            Суллах
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2 sm:min-w-36">
                      <button onClick={() => {
                        const messageParts = [
                          `Сайн байна уу, ${order.buyerDisplayName}.`,
                          `Таны захиалга: ${order.productCode}`,
                        ];
                        if (order.color && order.color !== DEFAULT_COLOR) messageParts.push(order.color);
                        if (order.size && order.size !== 'Нэг размер') messageParts.push(order.size);
                        messageParts.push(`x${order.quantity || 1}`);
                        messageParts.push(`Төлөх дүн: ${money(order.amount)}`);
                        messageParts.push(`Төлбөрөө шилжүүлээд нэр/утсаа бичээрэй.`);

                        const paymentRequestText = messageParts.join(' ');

                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(paymentRequestText);
                          setPaymentRequestCopyStatus(order.id);
                          window.setTimeout(() => setPaymentRequestCopyStatus(''), 2500);
                        } else {
                          alert('Clipboard API is not available.');
                        }
                      }} className="rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white">Төлбөр нэхэх</button>
                      <button onClick={() => markPaid(order.id)} className="rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white">Төлсөн болгох</button>
                      <button onClick={() => cancelOrder(order.id)} className="rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white">Цуцлах</button>
                    </div>
                  {paymentRequestCopyStatus === order.id && (
                    <p className="rounded-2xl bg-blue-100 p-2 text-center text-xs font-bold text-blue-700 sm:col-span-2 mt-2">
                      Төлбөр нэхэх текст хуулагдлаа
                    </p>
                  )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Төлбөрийн мэдээлэл наах</h2>
              <p className="mt-2 text-sm text-slate-600">Нэг худалдан авагч олон захиалгын төлбөрийг нэг гүйлгээгээр төлсөн бол Borlo нийлбэр дүнгээр нь тулгаж болно.</p>
            <p className="mt-1 text-sm text-slate-500">Demo-д Auto payment paste ашиглаж байна.</p>
            <textarea className="mt-4 min-h-32 w-full rounded-2xl border p-4 text-base" placeholder={'89000 Болор A12 99112233 (single match)\n239000 Болор 99112233 (combined)\n70000 Болор 99112233 (underpaid)\n500000 Болор 99112233 (overpaid)\n88000 Бат 88119922 (no match)'} value={paymentPaste} onChange={(e) => setPaymentPaste(e.target.value)} />
            <button onClick={parsePaymentEvents} className="mt-3 w-full rounded-2xl bg-violet-600 px-5 py-4 text-lg font-bold text-white">Payment тулгах</button>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black">Successful Payments</p>
                <p className="text-3xl font-black">{successfulPaymentEvents.length}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="font-black">Төлбөр шалгах шаардлагатай</p>
                <p className="text-3xl font-black">{paymentReviewEvents.length}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {successfulPaymentEvents.length === 0 && <p className="text-sm text-slate-500">Төлбөрийн тулгалтын мэдээлэл алга.</p>}
              {successfulPaymentEvents.map((item) => (
                <div key={item.id} className="rounded-2xl bg-emerald-50 p-4">
                  <p className="font-bold text-emerald-900">{getPaymentStatusLabel(item.status)} • {item.reason || `✅ ${item.orderId || item.orderIds?.join(', ')} төлөгдлөө — ${money(item.amount || 0)}`}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.rawText}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">Баглах захиалга</h2>
              <p className="text-sm text-slate-500">Зөвхөн төлсөн, баглахад бэлэн захиалга харагдана.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                if (paidOrders.length === 0) {
                  setPackingListCopyStatus('Хуулах баглаа боодлын жагсаалт алга');
                  window.setTimeout(() => setPackingListCopyStatus(''), 2500);
                  return;
                }
                const packingListHeader = 'Баглах жагсаалт:';
                const packingListItems = packingGroups.map((item) => `${item.productCode} ${item.productName} / ${item.color} / ${item.size} — ${item.totalQuantity}ш`);
                const packingListText = [packingListHeader, ...packingListItems].join('\n\n');

                if (navigator.clipboard) {
                  navigator.clipboard.writeText(packingListText);
                  setPackingListCopyStatus('Баглаа боодлын жагсаалт хуулагдлаа');
                  window.setTimeout(() => setPackingListCopyStatus(''), 2500);
                } else {
                  alert('Clipboard API is not available.');
                }
              }} className="rounded-2xl bg-blue-600 px-5 py-4 text-lg font-bold text-white">Баглах жагсаалт хуулах</button>
              <div className="flex gap-2">
              <button onClick={() => {
                if (paidOrders.length === 0) {
                  setPackingListCopyStatus('Хуулах баглаа боодлын жагсаалт алга');
                  window.setTimeout(() => setPackingListCopyStatus(''), 2500);
                  return;
                }
                const packingListHeader = 'Баглах жагсаалт:';
                const packingListItems = packingGroups.map((item) => `${item.productCode} ${item.productName} / ${item.color} / ${item.size} — ${item.totalQuantity}ш`);
                const packingListText = [packingListHeader, ...packingListItems].join('\n\n');

                if (navigator.clipboard) {
                  navigator.clipboard.writeText(packingListText);
                  setPackingListCopyStatus('Баглаа боодлын жагсаалт хуулагдлаа');
                  window.setTimeout(() => setPackingListCopyStatus(''), 2500);
                } else {
                  alert('Clipboard API is not available.');
                }
              }} className="rounded-2xl bg-blue-600 px-5 py-4 text-lg font-bold text-white">Баглах жагсаалт хуулах</button>
              <button onClick={exportOrdersCsv} className="rounded-2xl bg-slate-950 px-5 py-4 text-lg font-bold text-white">CSV татах</button>
            </div>
            </div>
          </div>
          {packingListCopyStatus && (
            <p className="rounded-2xl bg-emerald-50 p-2 text-center text-sm font-bold text-emerald-700 mt-3">
              {packingListCopyStatus}
            </p>
          )}

          <div className="mt-4 space-y-3">
            {paidPackingOrders.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">Одоогоор баглах төлсөн захиалга алга.</p>}
            {paidPackingOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xl font-black">Төлсөн захиалга: {order.id}</p>
                <p className="text-sm text-slate-700">Худалдан авагч: <b>{order.buyerDisplayName}</b></p>
                <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <p>Утас: <b>{order.phone || '-'}</b></p>
                  <p>Бараа: <b>{order.productCode} {order.productName}</b></p>
                  <p>Өнгө: <b>{order.color}</b></p>
                  <p>Размер: <b>{order.size}</b></p>
                  <p>Тоо: <b>{order.quantity}</b></p>
                  <p>Дүн: <b>{money(order.amount)}</b></p>
                  <p className="sm:col-span-2">Төлсөн цаг: <b>{dateTime(order.paidAt)}</b></p>
                  <p className="sm:col-span-2">Эх сурвалж: <b>{order.sourceCommentText || '-'}</b></p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
            <h3 className="text-lg font-black">Баглах товч нэгтгэл</h3>
            <div className="mt-2 space-y-2 text-sm">
              {packingGroups.map((item) => (
                <p key={`${item.productCode}-${item.color}-${item.size}`}>{item.productCode} / {item.productName} / {item.color} / {item.size} — {item.totalQuantity} ширхэг — {item.buyers.size} худалдан авагч</p>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-white p-4">
            <h3 className="text-lg font-black">Хүргэлтийн жагсаалт</h3>
            {deliveryRows.length === 0 && <p className="mt-2 text-slate-500">Одоогоор хүргэлтийн жагсаалт хоосон байна.</p>}
            <div className="mt-3 space-y-2">
              {deliveryRows.map((item) => (
                <div key={`${item.paidOrder}-${item.buyer}`} className="rounded-xl border p-3 text-sm">
                  <p>Худалдан авагч: <b>{item.buyer}</b></p>
                  <p>Утас: <b>{item.phone || '-'}</b></p>
                  <p>Төлсөн захиалга: <b>{item.paidOrder}</b></p>
                  <p>Нийт дүн: <b>{money(item.totalAmount)}</b></p>
                  <p>Хаяг: <b>{item.address || 'Хаяг оруулаагүй'}</b></p>
                  <p>Төлөв: <b>{item.phone ? 'Хүргэлт бэлдэх' : 'Хаяг дутуу'}</b></p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Шалгах</h2>
            <div className="mt-4 space-y-3">
              {unclearComments.length === 0 && <p className="text-slate-500">Шалгах коммент алга.</p>}
              {unclearComments.map((item) => (
                <div key={item.id} className="rounded-2xl bg-amber-50 p-4">
                  <p className="font-bold">{item.text}</p>
                  <p className="text-sm text-amber-800">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Төлбөр шалгах шаардлагатай</h2>
            <div className="mt-4 space-y-3">
              {paymentReviewEvents.length === 0 && <p className="text-slate-500">Шалгах шаардлагатай төлбөр алга. Дутуу, илүү эсвэл тодорхойгүй төлбөр энд харагдана.</p>}
              {paymentReviewEvents.map((item) => (
                <div key={item.id} className="rounded-2xl bg-rose-50 p-4">
                  <p className="font-bold">{item.rawText}</p>
                  <p className="text-sm inline-flex rounded-full bg-rose-200 px-3 py-1 font-bold text-rose-800">{getPaymentReviewReasonLabel(item.reason || '', item)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
            <h3 className="text-lg font-black">Баглах товч нэгтгэл</h3>
            <div className="mt-2 space-y-2 text-sm">
              {packingGroups.map((item) => (
                <p key={`${item.productCode}-${item.color}-${item.size}`}>{item.productCode} / {item.productName} / {item.color} / {item.size} — {item.totalQuantity} ширхэг — {item.buyers.size} худалдан авагч</p>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-white p-4">
            <h3 className="text-lg font-black">Хүргэлтийн жагсаалт</h3>
            {deliveryRows.length === 0 && <p className="mt-2 text-slate-500">Одоогоор хүргэлтийн жагсаалт хоосон байна.</p>}
            <div className="mt-3 space-y-2">
              {deliveryRows.map((item) => (
                <div key={`${item.paidOrder}-${item.buyer}`} className="rounded-xl border p-3 text-sm">
                  <p>Худалдан авагч: <b>{item.buyer}</b></p>
                  <p>Утас: <b>{item.phone || '-'}</b></p>
                  <p>Төлсөн захиалга: <b>{item.paidOrder}</b></p>
                  <p>Нийт дүн: <b>{money(item.totalAmount)}</b></p>
                  <p>Хаяг: <b>{item.address || 'Хаяг оруулаагүй'}</b></p>
                  <p>Төлөв: <b>{item.phone ? 'Хүргэлт бэлдэх' : 'Хаяг дутуу'}</b></p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-2xl font-black">Basic</p>
            <p className="mt-2 text-3xl font-black">99,000₮ / сар</p>
            <ul className="mt-4 space-y-2 text-slate-700">
              <li>- Manual Төлсөн товч</li>
              <li>- Stock удирдлага</li>
              <li>- CSV Packing list</li>
            </ul>
          </div>
          <div className="rounded-3xl border-2 border-violet-300 bg-violet-50 p-5 shadow-sm">
            <p className="text-2xl font-black">Auto</p>
            <p className="mt-2 text-3xl font-black">149,000₮ / сар + 1%</p>
            <ul className="mt-4 space-y-2 text-slate-700">
              <li>- Автомат payment matching</li>
              <li>- QPay симуляци</li>
              <li>- Бүх функц + ирээдүйн шинэчлэл</li>
            </ul>
            <p className="mt-4 rounded-2xl bg-white p-3 font-bold text-violet-800">Demo-д Auto payment paste ашиглаж байна.</p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">5 минутын demo заавар</h2>
              <p className="mt-2 text-sm text-slate-600">Энэ зааврыг seller-д demo үзүүлэхдээ дагахад хангалттай.</p>
          <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-sm leading-7 text-white">{`1. A12-ыг Active болгох
2. Лайв коммент наах:
   Болор: A12 хар M авъя
   Болор: C01 цагаан 38 авъя
3. Төлбөрийн мэдээлэл наах:
   239000 Болор 99112233
4. 2 pending захиалга зэрэг Төлсөн болно
5. Packing List-д A12 болон C01 хоёулаа харагдана
6. CSV татах товчийг дарна`}</pre>
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">Important: Хүлээгдэж буй захиалга үлдэгдэл-ийг аль хэдийн reserve хийдэг. Төлсөн болгоход үлдэгдэл дахин хасахгүй.</p>
        </section>

        <section id="insights" className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Лайвын дараах тайлангийн төв</h2>
              <p className="text-slate-700">Лайв урсгал → Захиалга → Төлбөр тулгалт → Үлдэгдэл → Баглаа боодол → Лайвын дараах тайлан</p>
            </div>
            <button onClick={() => setLiveFinished(true)} className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">Лайв дуусгах</button>
          </div>
          {liveFinished && (
            <div className="mt-4 space-y-4">
              <p className="rounded-2xl bg-emerald-50 p-3 font-semibold text-emerald-800">Лайвын дараах тайлан: Лайв дуусахад Borlo танд борлуулалт, төлбөр, үлдэгдэл, баглаа боодол, алдсан эрэлт, дараагийн лайвын бэлтгэлийн тайланг гаргаж өгнө.</p>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border p-4"><p className="font-black">A. Sales Summary</p><p className="text-sm">total comments: {todayMetrics.commentMentions} • detected order comments: {orders.length} • total orders: {orders.length} • total order amount: {money(orders.reduce((s,o)=>s+o.amount,0))} • paid amount: {money(revenue)} • pending amount: {money(pendingAmount)} • review amount: {money(reviewAmount)}</p></div>
                <div className="rounded-2xl border p-4"><p className="font-black">B. Payment Reconciliation</p><p className="text-sm">matched: {paymentStatusCounts.matched} • combined matched: {paymentStatusCounts.combinedMatched} • underpaid: {paymentStatusCounts.underpaid} • overpaid: {paymentStatusCounts.overpaid} • ambiguous: {paymentStatusCounts.ambiguous} • no match: {paymentStatusCounts.noMatch} • late payments: {paymentStatusCounts.latePayments}</p><p className="mt-2 text-sm font-semibold">Actions: Review payments • Upload bank statement • Export reconciliation CSV</p></div>
                <div className="rounded-2xl border p-4"><p className="font-black">C. Packing Summary</p><p className="text-sm">paid orders to pack: {paidOrders.length} • delivery orders • pickup orders • priority orders</p><p className="mt-2 text-sm">Exports: Захиалга CSV татах • Баглах жагсаалт CSV татах • Хүргэлтийн жагсаалт CSV татах • PDF тайлан — дараагийн хувилбар</p></div>
                <div className="rounded-2xl border p-4"><p className="font-black">D/E. Product & Missed Demand</p><p className="text-sm">demand by product/color/size • remaining stock • sold-out variants • comments requesting sold-out variants • estimated missed revenue</p></div>
                <div className="rounded-2xl border p-4"><p className="font-black">F/H. Дараагийн лайвын зөвлөмж ба гүйцэтгэл (дүрэмд суурилсан)</p><p className="text-sm">high requested/paid quantity, low remaining stock, out-of-stock demand, review demand • busiest comment period • busiest order period • comment-to-order conversion • order-to-paid conversion</p></div>
                <div className="rounded-2xl border p-4"><p className="font-black">G/I. Хэрэглэгчийн follow-up ба Export Center</p><p className="text-sm">paid/pending/review customers • repeat buyers • no-show placeholder • sales summary PDF placeholder • orders CSV • payment reconciliation CSV • packing/delivery/product demand/out-of-stock/customer follow-up CSV</p></div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
          <h2 className="text-xl font-black">Тэмдэглэл</h2>
          <p className="mt-2 text-slate-200">Зөвхөн demo хувилбар • Facebook Page Live холболтын тохиргоо шаардлагатай • Банкны API/QPay ашиглахгүй • Бүх өгөгдөл localStorage-д хадгалагдана</p>
        </section>
      </div>
    </main>
  )
}
