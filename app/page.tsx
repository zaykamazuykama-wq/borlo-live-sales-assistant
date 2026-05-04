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

type PaymentEvent = {
  id: string
  rawText: string
  amount?: number
  productCode?: string
  buyerName?: string
  phone?: string
  orderId?: string
  orderIds?: string[]
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
  paymentШалгахEvents: 'live-shop-payment-шалгах-events',
  successfulPaymentEvents: 'live-shop-successful-payment-events',
}

const BUY_KEYWORDS = ['авъя', 'авя', 'авая', 'авна', 'avya', 'avii', 'awya']
const TEN_MINUTES = 10 * 60 * 1000

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

function extractТоо ширхэг(text: string, productCode?: string) {
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

  return { amount, productCode, phone, buyerName }
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

export default function LiveShopManagerDemo() {
  const [trialLead, setTrialLead] = useState({
    facebook: '',
    phone: '',
    product: '',
    liveCount: '',
    plan: 'Эхлээд үнэгүй туршъя',
  })
  const [copyStatus, setCopyStatus] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [products, setБарааs] = useState<Бараа[]>(DEFAULT_PRODUCTS)
  const [activeБарааCode, setActiveБарааCode] = useState('A12')
  const [orders, setOrders] = useState<Order[]>([])
  const [unclearComments, setUnclearComments] = useState<ШалгахItem[]>([])
  const [paymentШалгахEvents, setPaymentШалгахEvents] = useState<PaymentEvent[]>([])
  const [successfulPaymentEvents, setSuccessfulPaymentEvents] = useState<PaymentEvent[]>([])
  const [commentPaste, setCommentPaste] = useState('Болор: A12 хар M авъя\nСараа: A12 улаан L 2ш\nНомин: C01 цагаан 38 авъя')
  const [paymentPaste, setPaymentPaste] = useState('89000 Болор A12 99112233')
  const [newБараа, setNewБараа] = useState({
    code: '',
    name: '',
    price: '',
    sizeTemplate: 'women-clothing' as РазмерTemplate,
    colors: '',
    variantStock: '',
  })
  const [language, setLanguage] = useState<'mn' | 'en'>('mn')

  const LANG_TEXT = {
    mn: {
      mainHeading: "Лайв Захиалга Тулгагч",
      subtitle: "Шууд борлуулалтын туслах / Live Sales Assistant",
      flow: "Коммент → Захиалга → Төлбөр → Үлдэгдэл → Баглаа боодол → CSV",
      trialBadge: "Туршилтын хувилбар — Facebook/QPay бодит холболт хийгдээгүй",
      demoResetButton: "Demo сэргээх",
      pendingCount: "Хүлээгдэж буй",
      paidPackingCount: "Төлсөн / Баглах",
      revenue: "Орлого",
      homeNav: "Нүүр",
      liveNav: "Лайв",
      ordersNav: "Захиалга",
      paymentsNav: "Төлбөр",
      productsNav: "Бараа",
      packingNav: "Баглаа боодол",
      insightsNav: "Тайлан",
      sellerLeadTitle: "Туршилт авах хүсэлт",
      sellerLeadCopy: "Анхны 2 live дээр Borlo-г туршиж үзээд, коммент → захиалга → төлбөр → үлдэгдэл → баглаа боодлын жагсаалт урсгалыг шалгаарай.",
      facebookPlaceholder: "Facebook page / лайв хаяг",
      phonePlaceholder: "Утас",
      productPlaceholder: "Гол зардаг бараа",
      liveCountPlaceholder: "Сард хэдэн live хийдэг вэ?",
      planHeading: "Сонирхож буй хувилбар:",
      basicPlan: "Basic 99,000₮",
      autoPlan: "Auto 149,000₮ + 1%",
      freeTrial: "Эхлээд үнэгүй туршъя",
      demoCta: "Demo авах",
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
    setPaymentШалгахEvents(safeParse<PaymentEvent[]>(localStorage.getItem(STORAGE_KEYS.paymentШалгахEvents), []))
    setSuccessfulPaymentEvents(safeParse<PaymentEvent[]>(localStorage.getItem(STORAGE_KEYS.successfulPaymentEvents), []))
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
    localStorage.setItem(STORAGE_KEYS.paymentШалгахEvents, JSON.stringify(paymentШалгахEvents))
  }, [hydrated, paymentШалгахEvents])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEYS.successfulPaymentEvents, JSON.stringify(successfulPaymentEvents))
  }, [hydrated, successfulPaymentEvents])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const expiredХүлээгдэж буйOrders = orders.filter((order) => order.status === 'Хүлээгдэж буй' && order.expiresAt <= now)
      if (expiredХүлээгдэж буйOrders.length === 0) return

      const releaseByVariant = new Map<string, number>()
      expiredХүлээгдэж буйOrders.forEach((order) => {
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

      const expiredIds = new Set(expiredХүлээгдэж буйOrders.map((order) => order.id))
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

  const maxOrderNumber = useMemo(() => Math.max(0, ...orders.map((order) => orderNumber(order.id))), [orders])

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

      const quantity = extractТоо ширхэг(line, product.code)
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
        expiresAt: now + TEN_MINUTES,
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

  function markТөлсөн(orderId: string, phone?: string) {
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
    const шалгахEvents: PaymentEvent[] = []
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

      const singleMatches = workingOrders.filter((order) => {
        if (order.status !== 'Хүлээгдэж буй') return false
        if (order.amount !== parsed.amount) return false
        if (parsed.productCode && order.productCode.toUpperCase() !== parsed.productCode.toUpperCase()) return false
        return isFuzzyBuyerMatch(order.buyerDisplayName, parsed.buyerName)
      })

      if (singleMatches.length === 1) {
        const order = singleMatches[0]
        paidOrderIdsWithPhone.set(order.id, parsed.phone)
        workingOrders = workingOrders.map((item) =>
          item.id === order.id && item.status === 'Хүлээгдэж буй'
            ? { ...item, status: 'Төлсөн', paidAt: now, phone: parsed.phone || item.phone }
            : item,
        )
        successEvents.push({
          id: makeId('PAYMENT-SUCCESS'),
          ...baseEvent,
          orderId: order.id,
          orderIds: [order.id],
          reason: `✅ ${order.id} төлөгдлөө — ${money(order.amount)}`,
        })
        return
      }

      const buyerХүлээгдэж буйOrders = workingOrders
        .filter((order) => {
          if (order.status !== 'Хүлээгдэж буй') return false
          if (parsed.productCode && order.productCode.toUpperCase() !== parsed.productCode.toUpperCase()) return false
          return isFuzzyBuyerMatch(order.buyerDisplayName, parsed.buyerName)
        })
        .slice(0, 10)

      const combinations = findExactAmountCombinations(buyerХүлээгдэж буйOrders, parsed.amount)

      if (singleMatches.length === 0 && combinations.length === 1) {
        const matchedOrders = combinations[0]
        matchedOrders.forEach((order) => paidOrderIdsWithPhone.set(order.id, parsed.phone))
        const matchedIds = new Set(matchedOrders.map((order) => order.id))
        workingOrders = workingOrders.map((order) =>
          matchedIds.has(order.id) && order.status === 'Хүлээгдэж буй'
            ? { ...order, status: 'Төлсөн', paidAt: now, phone: parsed.phone || order.phone }
            : order,
        )
        successEvents.push({
          id: makeId('PAYMENT-SUCCESS'),
          ...baseEvent,
          orderIds: matchedOrders.map((order) => order.id),
          reason: `✅ ${matchedOrders.length} захиалга төлөгдлөө: ${matchedOrders.map((order) => order.id).join(', ')} — ${money(parsed.amount || 0)}`,
        })
        return
      }

      let reason = 'Тохирох pending захиалга олдсонгүй'
      if (singleMatches.length > 1) {
        reason = 'Олон боломжит захиалга олдлоо'
      } else if (combinations.length > 1) {
        reason = 'Олон боломжит захиалгын нийлбэр таарч байна'
      } else if (buyerХүлээгдэж буйOrders.length > 0) {
        const buyerХүлээгдэж буйTotal = buyerХүлээгдэж буйOrders.reduce((sum, order) => sum + order.amount, 0)
        if (typeof parsed.amount === 'number' && parsed.amount < buyerХүлээгдэж буйTotal) reason = 'Төлбөр дутуу байна'
        else if (typeof parsed.amount === 'number' && parsed.amount > buyerХүлээгдэж буйTotal) reason = 'Төлбөр илүү байна'
      }

      шалгахEvents.push({
        id: makeId('PAYMENT-REVIEW'),
        ...baseEvent,
        reason,
      })
    })

    if (paidOrderIdsWithPhone.size > 0) {
      setOrders(orders.map((order) => {
        if (!paidOrderIdsWithPhone.has(order.id) || order.status !== 'Хүлээгдэж буй') return order
        return { ...order, status: 'Төлсөн', paidAt: now, phone: paidOrderIdsWithPhone.get(order.id) || order.phone }
      }))
    }
    if (successEvents.length > 0) setSuccessfulPaymentEvents([...successEvents, ...successfulPaymentEvents])
    if (шалгахEvents.length > 0) setPaymentШалгахEvents([...шалгахEvents, ...paymentШалгахEvents])
    setPaymentPaste('')
  }

  function exportCsv() {
    if (paidOrders.length === 0) {
      alert('Төлсөн захиалга алга байна.')
      return
    }

    const header = ['Order ID', 'Buyer', 'Phone', 'Бараа Code', 'Бараа Name', 'Өнгө', 'Размер', 'Тоо ширхэг', 'Amount', 'Төлсөн At']
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
      dateTime(order.paidAt),
    ])
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'live-shop-packing-list.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function resetDemo() {
    setБарааs(DEFAULT_PRODUCTS)
    setActiveБарааCode('A12')
    setOrders([])
    setUnclearComments([])
    setPaymentШалгахEvents([])
    setSuccessfulPaymentEvents([])
    setCommentPaste('Болор: A12 хар M авъя')
    setPaymentPaste('89000 Болор A12 99112233')
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <section id="home" className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-300">Borlo</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">Лайв Захиалга Тулгагч</h1>
              <p className="mt-2 text-lg font-semibold text-white">Шууд борлуулалтын туслах</p>
              <p className="mt-3 max-w-2xl text-slate-200">Коммент → Захиалга → Төлбөр → Үлдэгдэл → Баглаа боодол → CSV</p>
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
                Демо сэргээх
              </button>
            </div>
          </div>
        </section>

        <nav className="sticky top-3 z-20 rounded-3xl border bg-white/90 p-3 shadow-sm backdrop-blur">
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
                  Төлөгдсөн захиалгууд баглаа боодлын жагсаалт дээр гарч, CSV татахад бэлэн болно.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Хүлээгдэж буй</p>
            <p className="mt-2 text-4xl font-black">{pendingOrders.length}</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Төлсөн / Баглах</p>
            <p className="mt-2 text-4xl font-black">{paidOrders.length}</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Орлого</p>
            <p className="mt-2 text-4xl font-black">{money(revenue)}</p>
          </div>
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
                  navigator.clipboard.writeText(
                    `Сайн байна уу. Borlo-г анхны 2 live дээр туршиж үзмээр байна.\n\nFacebook/live хаяг: ${trialLead.facebook || '[энд бичнэ]'}\nУтас: ${trialLead.phone || '[энд бичнэ]'}\nГол зардаг бараа: ${trialLead.product || '[энд бичнэ]'}\nСард хийх live: ${trialLead.liveCount || '[энд бичнэ]'}\nСонирхож буй хувилбар: ${trialLead.plan}`
                  )
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
              )
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

        <section className="grid gap-5 lg:grid-cols-2">
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
            <h2 id="orders" className="text-2xl font-black">Лайв коммент наах</h2>
            <p className="mt-1 text-sm text-slate-500">Жишээ: Болор: A12 хар M авъя • Сараа: A12 хар 3XL авъя • Номин: C01 цагаан 42 авъя • E01 цагаан 28 авъя • F01 хар 32 2ш</p>
            <textarea className="mt-4 min-h-44 w-full rounded-2xl border p-4 text-base" value={commentPaste} onChange={(e) => setCommentPaste(e.target.value)} />
            <button onClick={parseComments} className="mt-3 w-full rounded-2xl bg-blue-600 px-5 py-4 text-lg font-bold text-white">Захиалга үүсгэх</button>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Хүлээгдэж буй захиалга</h2>
            <div className="mt-4 space-y-3">
              {pendingOrders.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">Хүлээгдэж буй захиалга алга.</p>}
              {pendingOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xl font-black">{order.id} • {order.buyerDisplayName}</p>
                      <p className="text-slate-600">{order.productCode} {order.productName} • {order.color} / {order.size} × {order.quantity}</p>
                      <p className="font-bold">{money(order.amount)}</p>
                      <p className="text-xs text-slate-500">Дуусах: {dateTime(order.expiresAt)}</p>
                    </div>
                    <div className="grid gap-2 sm:min-w-36">
                      <button onClick={() => markТөлсөн(order.id)} className="rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white">Төлсөн болгох</button>
                      <button onClick={() => cancelOrder(order.id)} className="rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white">Цуцлах</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Төлбөрийн мэдээлэл наах</h2>
              <p className="mt-2 text-sm text-slate-600">Нэг хүн олон захиалгаа нийлүүлж төлсөн бол review хэсэгт шалгах боломжтой.</p>
            <p className="mt-1 text-sm text-slate-500">Demo-д Auto payment paste ашиглаж байна.</p>
            <textarea className="mt-4 min-h-32 w-full rounded-2xl border p-4 text-base" value={paymentPaste} onChange={(e) => setPaymentPaste(e.target.value)} />
            <button onClick={parsePaymentEvents} className="mt-3 w-full rounded-2xl bg-violet-600 px-5 py-4 text-lg font-bold text-white">Payment тулгах</button>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black">Successful Payments</p>
                <p className="text-3xl font-black">{successfulPaymentEvents.length}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="font-black">Төлбөр шалгах шаардлагатай</p>
                <p className="text-3xl font-black">{paymentШалгахEvents.length}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {successfulPaymentEvents.length === 0 && <p className="text-sm text-slate-500">Амжилттай payment log алга.</p>}
              {successfulPaymentEvents.map((item) => (
                <div key={item.id} className="rounded-2xl bg-emerald-50 p-4">
                  <p className="font-bold text-emerald-900">{item.reason || `✅ ${item.orderId || item.orderIds?.join(', ')} төлөгдлөө — ${money(item.amount || 0)}`}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.rawText}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">Packing / Delivery List</h2>
              <p className="text-sm text-slate-500">Зөвхөн Төлсөн захиалга харагдана.</p>
            </div>
            <button onClick={exportCsv} className="rounded-2xl bg-slate-950 px-5 py-4 text-lg font-bold text-white">CSV татах</button>
          </div>
          <div className="mt-4 space-y-3">
            {paidOrders.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">Packing list хоосон байна.</p>}
            {paidOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xl font-black">{order.id} • {order.buyerDisplayName}</p>
                <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <p>Утас: <b>{order.phone || '-'}</b></p>
                  <p>Бараа: <b>{order.productCode} {order.productName}</b></p>
                  <p>Өнгө: <b>{order.color}</b></p>
                  <p>Сайз: <b>{order.size}</b></p>
                  <p>Тоо: <b>{order.quantity}</b></p>
                  <p>Дүн: <b>{money(order.amount)}</b></p>
                  <p className="sm:col-span-2">Төлсөн at: <b>{dateTime(order.paidAt)}</b></p>
                </div>
              </div>
            ))}
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
              {paymentШалгахEvents.length === 0 && <p className="text-slate-500">Төлбөр шалгах шаардлагатай алга.</p>}
              {paymentШалгахEvents.map((item) => (
                <div key={item.id} className="rounded-2xl bg-rose-50 p-4">
                  <p className="font-bold">{item.rawText}</p>
                  <p className="text-sm text-rose-800">{item.reason}</p>
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

        <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
          <h2 className="text-xl font-black">Limitations</h2>
          <p className="mt-2 text-slate-200">Demo only • Facebook comment manual paste • QPay туршилтын matching • Client-side timer • All data saved in browser localStorage</p>
        </section>
      </div>
    </main>
  )
}
