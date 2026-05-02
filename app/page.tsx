'use client'

import { useEffect, useMemo, useState } from 'react'

type SizeTemplate = 'clothing' | 'one-size' | 'shoes' | 'european' | 'custom'

type ProductVariant = {
  color: string
  size: string
  stock: number
}

type Product = {
  code: string
  name: string
  price: number
  sizeTemplate: SizeTemplate
  colors: string[]
  variants: ProductVariant[]
}

type OrderStatus = 'Pending' | 'Paid' | 'Expired' | 'Cancelled'

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

type ReviewItem = {
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

const SIZE_TEMPLATES: Record<SizeTemplate, string[]> = {
  clothing: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'],
  shoes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  european: ['34', '36', '38', '40', '42', '44', '46', '48', '50', '52'],
  'one-size': ['Нэг размер'],
  custom: [],
}

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

const DEFAULT_PRODUCTS: Product[] = [
  {
    code: 'A12',
    name: 'Даашинз',
    price: 89000,
    sizeTemplate: 'clothing',
    colors: ['Хар', 'Улаан'],
    variants: [
      { color: 'Хар', size: 'S', stock: 1 },
      { color: 'Хар', size: 'M', stock: 2 },
      { color: 'Хар', size: 'L', stock: 1 },
      { color: 'Хар', size: 'XL', stock: 1 },
      { color: 'Улаан', size: 'M', stock: 1 },
      { color: 'Улаан', size: 'L', stock: 2 },
    ],
  },
  {
    code: 'B01',
    name: 'Цүнх',
    price: 120000,
    sizeTemplate: 'one-size',
    colors: ['Хар'],
    variants: [{ color: 'Хар', size: 'Нэг размер', stock: 3 }],
  },
  {
    code: 'C01',
    name: 'Эмэгтэй гутал',
    price: 150000,
    sizeTemplate: 'shoes',
    colors: ['Цагаан', 'Хар'],
    variants: [
      { color: 'Цагаан', size: '37', stock: 1 },
      { color: 'Цагаан', size: '38', stock: 2 },
      { color: 'Цагаан', size: '42', stock: 1 },
      { color: 'Хар', size: '38', stock: 1 },
      { color: 'Хар', size: '39', stock: 2 },
      { color: 'Хар', size: '40', stock: 1 },
      { color: 'Хар', size: '41', stock: 1 },
    ],
  },
  {
    code: 'D01',
    name: 'Пальто',
    price: 210000,
    sizeTemplate: 'european',
    colors: ['Хар', 'Саарал'],
    variants: [
      { color: 'Хар', size: '40', stock: 1 },
      { color: 'Хар', size: '42', stock: 2 },
      { color: 'Саарал', size: '44', stock: 1 },
    ],
  },
]

const STORAGE_KEYS = {
  products: 'live-shop-products',
  activeProductCode: 'live-shop-active-product-code',
  orders: 'live-shop-orders',
  unclearComments: 'live-shop-unclear-comments',
  paymentReviewEvents: 'live-shop-payment-review-events',
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

function findProductInText(text: string, products: Product[]) {
  return products.find((product) => productCodeRegex(product.code).test(text))
}

function normalizeProduct(product: Product & { stock?: number; sizeTemplate?: SizeTemplate }): Product {
  const sizeTemplate = product.sizeTemplate || 'one-size'
  const colors = product.colors?.length ? product.colors : [DEFAULT_COLOR]
  const variants = product.variants?.length
    ? product.variants
    : [{ color: colors[0], size: SIZE_TEMPLATES[sizeTemplate][0] || 'Нэг размер', stock: product.stock || 0 }]

  return { ...product, sizeTemplate, colors, variants }
}

function totalStock(product: Product) {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0)
}

function productSizes(product: Product) {
  if (product.sizeTemplate !== 'custom') return SIZE_TEMPLATES[product.sizeTemplate]
  return Array.from(new Set(product.variants.map((variant) => variant.size)))
}

function variantKey(productCode: string, color: string, size: string) {
  return `${productCode}||${color}||${size}`
}

function findVariant(product: Product, color: string, size: string) {
  return product.variants.find((variant) => variant.color === color && variant.size === size)
}

function updateVariantStock(product: Product, color: string, size: string, delta: number): Product {
  return {
    ...product,
    variants: product.variants.map((variant) =>
      variant.color === color && variant.size === size ? { ...variant, stock: variant.stock + delta } : variant,
    ),
  }
}

function findKnownColorInText(text: string) {
  const lower = text.toLowerCase()
  return [...SUPPORTED_COLORS]
    .sort((a, b) => b.length - a.length)
    .find((color) => new RegExp(`(^|[^\p{L}])${color.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\p{L}]|$)`, 'u').test(lower))
}

function detectColor(text: string, product: Product) {
  const colors = product.colors.length ? product.colors : [DEFAULT_COLOR]
  if (colors.length === 1) return { color: colors[0] }

  const detected = findKnownColorInText(text)
  if (!detected) return { reason: 'Өнгө тодорхойгүй байна' }

  const productColor = colors.find((color) => color.toLowerCase() === detected.toLowerCase())
  return productColor ? { color: productColor } : { reason: 'Ийм өнгө алга байна' }
}

function detectSize(text: string, product: Product) {
  const sizes = productSizes(product)
  if (sizes.length === 1) return { size: sizes[0] }

  const tokens: string[] = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []
  const detected = sizes.find((size) => tokens.includes(size.toLowerCase()))
  return detected ? { size: detected } : { reason: 'Сайз тодорхойгүй байна' }
}

function parseColorsInput(value: string) {
  const colors = value.split(',').map((color) => color.trim()).filter(Boolean)
  return colors.length > 0 ? colors : [DEFAULT_COLOR]
}

function parseVariantStockInput(value: string, colors: string[], template: SizeTemplate) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.+?)\s*\/\s*(.+?)\s*:\s*(\d+)$/)
      if (!match) return undefined
      const color = colors.find((item) => item.toLowerCase() === match[1].trim().toLowerCase()) || match[1].trim()
      const rawSize = match[2].trim()
      const size = SIZE_TEMPLATES[template].find((item) => item.toLowerCase() === rawSize.toLowerCase()) || rawSize
      return { color, size, stock: Number(match[3]) }
    })
    .filter((variant): variant is ProductVariant =>
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
  const [hydrated, setHydrated] = useState(false)
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS)
  const [activeProductCode, setActiveProductCode] = useState('A12')
  const [orders, setOrders] = useState<Order[]>([])
  const [unclearComments, setUnclearComments] = useState<ReviewItem[]>([])
  const [paymentReviewEvents, setPaymentReviewEvents] = useState<PaymentEvent[]>([])
  const [successfulPaymentEvents, setSuccessfulPaymentEvents] = useState<PaymentEvent[]>([])
  const [commentPaste, setCommentPaste] = useState('Болор: A12 хар M авъя\nСараа: A12 улаан L 2ш\nНомин: C01 цагаан 38 авъя')
  const [paymentPaste, setPaymentPaste] = useState('89000 Болор A12 99112233')
  const [newProduct, setNewProduct] = useState({
    code: '',
    name: '',
    price: '',
    sizeTemplate: 'clothing' as SizeTemplate,
    colors: '',
    variantStock: '',
  })

  useEffect(() => {
    setProducts(safeParse<Product[]>(localStorage.getItem(STORAGE_KEYS.products), DEFAULT_PRODUCTS).map(normalizeProduct))
    setActiveProductCode(localStorage.getItem(STORAGE_KEYS.activeProductCode) || 'A12')
    setOrders(safeParse<Order[]>(localStorage.getItem(STORAGE_KEYS.orders), []))
    setUnclearComments(safeParse<ReviewItem[]>(localStorage.getItem(STORAGE_KEYS.unclearComments), []))
    setPaymentReviewEvents(safeParse<PaymentEvent[]>(localStorage.getItem(STORAGE_KEYS.paymentReviewEvents), []))
    setSuccessfulPaymentEvents(safeParse<PaymentEvent[]>(localStorage.getItem(STORAGE_KEYS.successfulPaymentEvents), []))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products))
  }, [hydrated, products])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEYS.activeProductCode, activeProductCode)
  }, [activeProductCode, hydrated])

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
    const interval = setInterval(() => {
      const now = Date.now()
      const expiredPendingOrders = orders.filter((order) => order.status === 'Pending' && order.expiresAt <= now)
      if (expiredPendingOrders.length === 0) return

      const releaseByVariant = new Map<string, number>()
      expiredPendingOrders.forEach((order) => {
        const key = variantKey(order.productCode, order.color, order.size)
        releaseByVariant.set(key, (releaseByVariant.get(key) || 0) + order.quantity)
      })

      setProducts((currentProducts) =>
        currentProducts.map((product) => ({
          ...product,
          variants: product.variants.map((variant) => ({
            ...variant,
            stock: variant.stock + (releaseByVariant.get(variantKey(product.code, variant.color, variant.size)) || 0),
          })),
        })),
      )

      const expiredIds = new Set(expiredPendingOrders.map((order) => order.id))
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          expiredIds.has(order.id) && order.status === 'Pending'
            ? { ...order, status: 'Expired', expiredAt: now }
            : order,
        ),
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [orders])

  const activeProduct = products.find((product) => product.code === activeProductCode) || products[0]
  const pendingOrders = orders.filter((order) => order.status === 'Pending')
  const paidOrders = orders.filter((order) => order.status === 'Paid')
  const revenue = paidOrders.reduce((sum, order) => sum + order.amount, 0)

  const maxOrderNumber = useMemo(() => Math.max(0, ...orders.map((order) => orderNumber(order.id))), [orders])

  function addProduct() {
    const code = newProduct.code.trim().toUpperCase()
    const name = newProduct.name.trim()
    const price = Number(newProduct.price)
    const colors = parseColorsInput(newProduct.colors)
    const variants = parseVariantStockInput(newProduct.variantStock, colors, newProduct.sizeTemplate)

    if (!code || !name || price <= 0 || variants.length === 0) {
      alert('Бүтээгдэхүүний мэдээлэл болон variant stock-оо зөв бөглөнө үү.')
      return
    }

    if (products.some((product) => product.code === code)) {
      alert('Ийм кодтой бүтээгдэхүүн байна.')
      return
    }

    setProducts([...products, { code, name, price, sizeTemplate: newProduct.sizeTemplate, colors, variants }])
    setActiveProductCode(code)
    setNewProduct({ code: '', name: '', price: '', sizeTemplate: 'clothing', colors: '', variantStock: '' })
  }

  function parseComments() {
    const lines = commentPaste.split('\n').map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) return

    const availableStockByVariant = new Map(
      products.flatMap((product) =>
        product.variants.map((variant) => [variantKey(product.code, variant.color, variant.size), variant.stock] as const),
      ),
    )
    const newOrders: Order[] = []
    const newReviews: ReviewItem[] = []
    let orderSequence = maxOrderNumber + 1
    const now = Date.now()

    lines.forEach((line) => {
      const codedProduct = findProductInText(line, products)
      const product = codedProduct || (hasBuyKeyword(line) ? activeProduct : undefined)

      if (!product) {
        newReviews.push({
          id: makeId('COMMENT-REVIEW'),
          text: line,
          reason: 'Бүтээгдэхүүн тодорхойгүй байна',
          createdAt: now,
        })
        return
      }

      const colorResult = detectColor(line, product)
      if (!colorResult.color) {
        newReviews.push({ id: makeId('COMMENT-REVIEW'), text: line, reason: colorResult.reason || 'Өнгө тодорхойгүй байна', createdAt: now })
        return
      }

      const sizeResult = detectSize(line, product)
      if (!sizeResult.size) {
        newReviews.push({ id: makeId('COMMENT-REVIEW'), text: line, reason: sizeResult.reason || 'Сайз тодорхойгүй байна', createdAt: now })
        return
      }

      const variant = findVariant(product, colorResult.color, sizeResult.size)
      if (!variant) {
        newReviews.push({ id: makeId('COMMENT-REVIEW'), text: line, reason: 'Ийм variant алга байна', createdAt: now })
        return
      }

      const quantity = extractQuantity(line, product.code)
      const key = variantKey(product.code, colorResult.color, sizeResult.size)
      const available = availableStockByVariant.get(key) || 0

      if (quantity > available) {
        newReviews.push({
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
        status: 'Pending',
        sourceCommentText: line,
        createdAt: now,
        expiresAt: now + TEN_MINUTES,
      })
    })

    setProducts(products.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        stock: availableStockByVariant.get(variantKey(product.code, variant.color, variant.size)) ?? variant.stock,
      })),
    })))
    if (newOrders.length > 0) setOrders([...orders, ...newOrders])
    if (newReviews.length > 0) setUnclearComments([...newReviews, ...unclearComments])
    setCommentPaste('')
  }

  function markPaid(orderId: string, phone?: string) {
    const now = Date.now()
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId && order.status === 'Pending'
          ? { ...order, status: 'Paid', paidAt: now, phone: phone || order.phone }
          : order,
      ),
    )
  }

  function cancelOrder(orderId: string) {
    const now = Date.now()
    const order = orders.find((item) => item.id === orderId)
    if (!order || order.status !== 'Pending') return

    setProducts(products.map((product) =>
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

      const singleMatches = workingOrders.filter((order) => {
        if (order.status !== 'Pending') return false
        if (order.amount !== parsed.amount) return false
        if (parsed.productCode && order.productCode.toUpperCase() !== parsed.productCode.toUpperCase()) return false
        return isFuzzyBuyerMatch(order.buyerDisplayName, parsed.buyerName)
      })

      if (singleMatches.length === 1) {
        const order = singleMatches[0]
        paidOrderIdsWithPhone.set(order.id, parsed.phone)
        workingOrders = workingOrders.map((item) =>
          item.id === order.id && item.status === 'Pending'
            ? { ...item, status: 'Paid', paidAt: now, phone: parsed.phone || item.phone }
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

      const buyerPendingOrders = workingOrders
        .filter((order) => {
          if (order.status !== 'Pending') return false
          if (parsed.productCode && order.productCode.toUpperCase() !== parsed.productCode.toUpperCase()) return false
          return isFuzzyBuyerMatch(order.buyerDisplayName, parsed.buyerName)
        })
        .slice(0, 10)

      const combinations = findExactAmountCombinations(buyerPendingOrders, parsed.amount)

      if (singleMatches.length === 0 && combinations.length === 1) {
        const matchedOrders = combinations[0]
        matchedOrders.forEach((order) => paidOrderIdsWithPhone.set(order.id, parsed.phone))
        const matchedIds = new Set(matchedOrders.map((order) => order.id))
        workingOrders = workingOrders.map((order) =>
          matchedIds.has(order.id) && order.status === 'Pending'
            ? { ...order, status: 'Paid', paidAt: now, phone: parsed.phone || order.phone }
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
      } else if (buyerPendingOrders.length > 0) {
        const buyerPendingTotal = buyerPendingOrders.reduce((sum, order) => sum + order.amount, 0)
        if (typeof parsed.amount === 'number' && parsed.amount < buyerPendingTotal) reason = 'Төлбөр дутуу байна'
        else if (typeof parsed.amount === 'number' && parsed.amount > buyerPendingTotal) reason = 'Төлбөр илүү байна'
      }

      reviewEvents.push({
        id: makeId('PAYMENT-REVIEW'),
        ...baseEvent,
        reason,
      })
    })

    if (paidOrderIdsWithPhone.size > 0) {
      setOrders(orders.map((order) => {
        if (!paidOrderIdsWithPhone.has(order.id) || order.status !== 'Pending') return order
        return { ...order, status: 'Paid', paidAt: now, phone: paidOrderIdsWithPhone.get(order.id) || order.phone }
      }))
    }
    if (successEvents.length > 0) setSuccessfulPaymentEvents([...successEvents, ...successfulPaymentEvents])
    if (reviewEvents.length > 0) setPaymentReviewEvents([...reviewEvents, ...paymentReviewEvents])
    setPaymentPaste('')
  }

  function exportCsv() {
    if (paidOrders.length === 0) {
      alert('Paid захиалга алга байна.')
      return
    }

    const header = ['Order ID', 'Buyer', 'Phone', 'Product Code', 'Product Name', 'Color', 'Size', 'Quantity', 'Amount', 'Paid At']
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
    setProducts(DEFAULT_PRODUCTS)
    setActiveProductCode('A12')
    setOrders([])
    setUnclearComments([])
    setPaymentReviewEvents([])
    setSuccessfulPaymentEvents([])
    setCommentPaste('Болор: A12 хар M авъя')
    setPaymentPaste('89000 Болор A12 99112233')
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-300">Лайв Захиалга Тулгагч</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">Live Shop Manager</h1>
              <p className="mt-3 max-w-2xl text-slate-200">Comment → Order → Payment status → Stock → Packing list → CSV export</p>
            </div>
            <button onClick={resetDemo} className="rounded-2xl bg-white px-5 py-4 text-lg font-bold text-slate-950 shadow active:scale-95">
              Demo reset
            </button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending count</p>
            <p className="mt-2 text-4xl font-black">{pendingOrders.length}</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Paid / Packing count</p>
            <p className="mt-2 text-4xl font-black">{paidOrders.length}</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Revenue</p>
            <p className="mt-2 text-4xl font-black">{money(revenue)}</p>
          </div>
        </section>

        {activeProduct && (
          <section className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-bold uppercase text-emerald-700">Active product</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <div><p className="text-xs text-slate-500">Код</p><p className="text-2xl font-black">{activeProduct.code}</p></div>
              <div><p className="text-xs text-slate-500">Нэр</p><p className="text-2xl font-black">{activeProduct.name}</p></div>
              <div><p className="text-xs text-slate-500">Үнэ</p><p className="text-2xl font-black">{money(activeProduct.price)}</p></div>
              <div><p className="text-xs text-slate-500">Үлдэгдэл</p><p className="text-2xl font-black">{totalStock(activeProduct)}</p></div>
            </div>
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Бүтээгдэхүүн</h2>
            <div className="mt-4 space-y-3">
              {products.map((product) => (
                <div key={product.code} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xl font-black">{product.code} — {product.name}</p>
                      <p className="text-slate-600">{money(product.price)} • stock {totalStock(product)} • {product.sizeTemplate}</p>
                      <p className="mt-1 text-sm text-slate-500">Өнгө: {product.colors.join(', ')}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {product.variants.map((variant) => `${variant.color}/${variant.size}: ${variant.stock}`).join(' • ')}
                      </p>
                    </div>
                    <button onClick={() => setActiveProductCode(product.code)} className={`rounded-2xl px-5 py-3 font-bold ${activeProductCode === product.code ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                      {activeProductCode === product.code ? 'Active' : 'Active болгох'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input className="rounded-2xl border p-4" placeholder="Код: C03" value={newProduct.code} onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })} />
              <input className="rounded-2xl border p-4" placeholder="Нэр" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
              <input className="rounded-2xl border p-4" placeholder="Үнэ" type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
              <select className="rounded-2xl border p-4" value={newProduct.sizeTemplate} onChange={(e) => setNewProduct({ ...newProduct, sizeTemplate: e.target.value as SizeTemplate })}>
                <option value="one-size">Нэг размер</option>
                <option value="clothing">Хувцас size</option>
                <option value="shoes">Гутлын размер</option>
                <option value="european">Европ размер</option>
                <option value="custom">Custom size</option>
              </select>
              <input className="rounded-2xl border p-4 sm:col-span-2" placeholder="Өнгө: Хар, Улаан, Цагаан" value={newProduct.colors} onChange={(e) => setNewProduct({ ...newProduct, colors: e.target.value })} />
              <textarea className="min-h-24 rounded-2xl border p-4 sm:col-span-2" placeholder="Variant stock: Хар/S:1, Хар/M:2, Улаан/L:2" value={newProduct.variantStock} onChange={(e) => setNewProduct({ ...newProduct, variantStock: e.target.value })} />
              <button onClick={addProduct} className="rounded-2xl bg-slate-950 px-5 py-4 text-lg font-bold text-white sm:col-span-2">Бүтээгдэхүүн нэмэх</button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Коммент наах</h2>
            <p className="mt-1 text-sm text-slate-500">Жишээ: Болор: A12 хар M авъя • Сараа: A12 хар 3XL авъя • Номин: C01 цагаан 42 авъя • D01 хар 42 авъя</p>
            <textarea className="mt-4 min-h-44 w-full rounded-2xl border p-4 text-base" value={commentPaste} onChange={(e) => setCommentPaste(e.target.value)} />
            <button onClick={parseComments} className="mt-3 w-full rounded-2xl bg-blue-600 px-5 py-4 text-lg font-bold text-white">Захиалга үүсгэх</button>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Pending захиалга</h2>
            <div className="mt-4 space-y-3">
              {pendingOrders.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">Pending захиалга алга.</p>}
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
                      <button onClick={() => markPaid(order.id)} className="rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white">Paid болгох</button>
                      <button onClick={() => cancelOrder(order.id)} className="rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white">Цуцлах</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Payment event наах</h2>
            <p className="mt-1 text-sm text-slate-500">Demo-д Auto payment paste ашиглаж байна.</p>
            <textarea className="mt-4 min-h-32 w-full rounded-2xl border p-4 text-base" value={paymentPaste} onChange={(e) => setPaymentPaste(e.target.value)} />
            <button onClick={parsePaymentEvents} className="mt-3 w-full rounded-2xl bg-violet-600 px-5 py-4 text-lg font-bold text-white">Payment тулгах</button>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black">Successful Payments</p>
                <p className="text-3xl font-black">{successfulPaymentEvents.length}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="font-black">Payment Review</p>
                <p className="text-3xl font-black">{paymentReviewEvents.length}</p>
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
              <p className="text-sm text-slate-500">Зөвхөн Paid захиалга харагдана.</p>
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
                  <p className="sm:col-span-2">Paid at: <b>{dateTime(order.paidAt)}</b></p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Review</h2>
            <div className="mt-4 space-y-3">
              {unclearComments.length === 0 && <p className="text-slate-500">Review коммент алга.</p>}
              {unclearComments.map((item) => (
                <div key={item.id} className="rounded-2xl bg-amber-50 p-4">
                  <p className="font-bold">{item.text}</p>
                  <p className="text-sm text-amber-800">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Payment Review</h2>
            <div className="mt-4 space-y-3">
              {paymentReviewEvents.length === 0 && <p className="text-slate-500">Payment review алга.</p>}
              {paymentReviewEvents.map((item) => (
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
              <li>- Manual Paid товч</li>
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
          <h2 className="text-2xl font-black">5-minute demo guide</h2>
          <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-sm leading-7 text-white">{`1. A12-ыг Active болгох
2. Коммент наах:
   Болор: A12 хар M авъя
   Болор: C01 цагаан 38 авъя
3. Payment event наах:
   239000 Болор 99112233
4. 2 pending захиалга зэрэг Paid болно
5. Packing List-д A12 болон C01 хоёулаа харагдана
6. CSV татах товчийг дарна`}</pre>
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">Important: Pending захиалга stock-ийг аль хэдийн reserve хийдэг. Paid болгоход stock дахин хасахгүй.</p>
        </section>

        <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
          <h2 className="text-xl font-black">Limitations</h2>
          <p className="mt-2 text-slate-200">Demo only • Facebook comment manual paste • QPay simulated • Client-side timer • All data saved in browser localStorage</p>
        </section>
      </div>
    </main>
  )
}
