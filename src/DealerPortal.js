import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import loginBg from './assets/login-bg.png'
import kesifKutusuLogo from './assets/kesif-kutusu-logo.png'
import RoleGuideModal from './RoleGuideModal'
import { downloadSchoolFormReport } from './formExportUtils'
import useIsMobile from './useIsMobile'

const COLORS = {
  primary: '#8C479C', yellow: '#FCC400', teal: '#60CDCB',
  green: '#86B535', orange: '#EC6A34', pink: '#D7508B', bg: '#f8f4ff',
}

const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-'
const VAT_RATE = 0.2
const VAT_TAXABLE_PORTION = 1 / 3
const getVatAmount = (amount) => (parseFloat(amount) || 0) * VAT_RATE * VAT_TAXABLE_PORTION
const getAmountWithVat = (amount) => (amount || 0) + getVatAmount(amount)

const S = {
  header: { background: COLORS.primary, padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  nav: { background: '#7a3d88', display: 'flex', padding: '0 28px' },
  navItem: (active, mobile = false) => ({ padding: mobile ? '10px 12px' : '12px 16px', cursor: 'pointer', color: active ? '#FCC400' : 'rgba(255,255,255,0.7)', fontWeight: active ? 700 : 400, fontSize: 14, borderBottom: active ? '3px solid #FCC400' : '3px solid transparent', whiteSpace: 'nowrap', flexShrink: 0 }),
  main: { padding: '28px 32px', background: COLORS.bg, minHeight: '100vh', position: 'relative', overflow: 'hidden' },
  card: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(140,71,156,0.08)', marginBottom: 16, overflowX: 'auto' },
  btn: (color) => ({ padding: '9px 18px', borderRadius: 9, background: color || COLORS.primary, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }),
  input: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '2px solid #f0e8ff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '2px solid #f0e8ff', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' },
  label: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', padding: '10px 12px', borderBottom: '2px solid #f0e8ff' },
  td: { padding: '11px 12px', fontSize: 13, color: '#333', borderBottom: '1px solid #f9f0ff' },
  badge: (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + '22', color: color }),
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modalBox: { background: '#fff', borderRadius: 16, padding: 28, width: 580, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' },
  guideFab: {
    position: 'fixed',
    top: 14,
    right: 14,
    width: 46,
    height: 46,
    borderRadius: 999,
    border: 'none',
    background: 'linear-gradient(135deg,#8C479C,#4F66D6,#60CDCB)',
    color: '#fff',
    fontSize: 21,
    cursor: 'pointer',
    boxShadow: '0 10px 26px rgba(44,40,117,0.34)',
    zIndex: 1301,
  },
}

const BASE_URL = window.location.origin
const ACTIVITY_MARKER_GRADE = '__ETKINLIK__'
const PRODUCT_MARKER_GRADE = '__URUN__'
const DEALER_GUIDE_DISMISS_KEY = 'kk_dealer_guide_dismissed'
const PREORDER_FORECAST_MARKER = '[[CLASS_FORECAST]]'
const FORECAST_GRADES = ['4 Yaş', '5-6 Yaş', '1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf', '5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf']
const parseAmount = (value) => parseFloat(value) || 0
const normalizeTrText = (value) => String(value || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim()
const isMiniskopCenterDealer = (dealer) => {
  const name = normalizeTrText(dealer?.name)
  const username = normalizeTrText(dealer?.username)
  return name.includes('miniskop merkez') || username.includes('miniskopmerkez') || username.includes('miniskop-merkez')
}
const getPreOrderSubtotal = (preOrder) => (preOrder?.pre_order_items || []).reduce(
  (sum, item) => sum + ((parseInt(item?.qty, 10) || 0) * parseAmount(item?.unit_price)),
  0
)
const sanitizeForecastRows = (rows = []) => (rows || [])
  .map(row => ({
    grade: row?.grade || FORECAST_GRADES[0],
    qty: parseInt(row?.qty, 10) || 0,
  }))
  .filter(row => row.grade && row.qty > 0)
const splitPreOrderNote = (rawNote) => {
  const note = String(rawNote || '')
  const markerIndex = note.indexOf(PREORDER_FORECAST_MARKER)
  if (markerIndex < 0) return { userNote: note.trim(), forecastRows: [] }
  const userNote = note.slice(0, markerIndex).trim()
  const forecastRaw = note.slice(markerIndex + PREORDER_FORECAST_MARKER.length).trim()
  try {
    const parsed = JSON.parse(forecastRaw)
    return { userNote, forecastRows: sanitizeForecastRows(parsed) }
  } catch {
    return { userNote, forecastRows: [] }
  }
}
const buildPreOrderNote = (rawNote, forecastRows = []) => {
  const { userNote } = splitPreOrderNote(rawNote)
  const normalizedRows = sanitizeForecastRows(forecastRows)
  if (normalizedRows.length === 0) return userNote
  const payload = `${PREORDER_FORECAST_MARKER}${JSON.stringify(normalizedRows)}`
  return userNote ? `${userNote}\n\n${payload}` : payload
}
const getPreOrderCargoFee = () => 0
const generatePreOrderId = (seed = 0) => `ON-${(Date.now() + seed).toString().slice(-8)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
const getOrderCargoFee = (order) => parseAmount(order?.cargo_fee)
const getOrderTeacherSetCount = () => 0
const getOrderTotalWithCargo = (order) => parseAmount(order?.total) + getOrderCargoFee(order)
const normalizeImportText = (value) => String(value || '')
  .toLocaleLowerCase('tr-TR')
  .replace(/ı/g, 'i')
  .replace(/ğ/g, 'g')
  .replace(/ü/g, 'u')
  .replace(/ş/g, 's')
  .replace(/ö/g, 'o')
  .replace(/ç/g, 'c')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
const parseExcelQty = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
  let normalized = String(value || '').trim()
  if (!normalized) return 0
  normalized = normalized.replace(/\s+/g, '')
  const hasComma = normalized.includes(',')
  const hasDot = normalized.includes('.')
  if (hasComma && hasDot) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) normalized = normalized.replace(/\./g, '').replace(',', '.')
    else normalized = normalized.replace(/,/g, '')
  } else if (hasComma) normalized = normalized.replace(/\./g, '').replace(',', '.')
  else if ((normalized.match(/\./g) || []).length > 1) {
    const pieces = normalized.split('.')
    const decimal = pieces.pop()
    normalized = `${pieces.join('')}.${decimal}`
  }
  const parsed = parseFloat(normalized.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.round(parsed))
}
const parseExcelAmount = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : 0
  let normalized = String(value || '').trim()
  if (!normalized) return 0
  normalized = normalized.replace(/[₺TLtl]/g, '').replace(/\s+/g, '')
  const hasComma = normalized.includes(',')
  const hasDot = normalized.includes('.')
  if (hasComma && hasDot) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) normalized = normalized.replace(/\./g, '').replace(',', '.')
    else normalized = normalized.replace(/,/g, '')
  } else if (hasComma) normalized = normalized.replace(/\./g, '').replace(',', '.')
  else if ((normalized.match(/\./g) || []).length > 1) {
    const pieces = normalized.split('.')
    const decimal = pieces.pop()
    normalized = `${pieces.join('')}.${decimal}`
  }
  const parsed = parseFloat(normalized.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}
const getExcelLabelValue = (rows = [], labels = []) => {
  const normalizedLabels = labels.map(normalizeImportText).filter(Boolean)
  for (const row of rows) {
    for (let idx = 0; idx < row.length; idx++) {
      const normalizedCell = normalizeImportText(row[idx])
      if (!normalizedCell) continue
      if (!normalizedLabels.some(label => normalizedCell.includes(label))) continue
      for (let valueIdx = idx + 1; valueIdx < row.length; valueIdx++) {
        const candidate = String(row[valueIdx] || '').trim()
        if (candidate) return candidate
      }
    }
  }
  return ''
}
const isExcelQtyHeader = (cellValue) => {
  const normalized = normalizeImportText(cellValue)
  if (!normalized) return false
  return (
    normalized.includes('adet') ||
    normalized.includes('aded') ||
    normalized.includes('miktar') ||
    normalized.includes('sayi')
  )
}
const findExcelDiscountedPriceColumn = (normalizedRow = []) => {
  const discountedIdx = normalizedRow.findIndex(cell => cell.includes('indirimli'))
  if (discountedIdx >= 0) return discountedIdx
  const corporatePriceIdx = normalizedRow.findIndex(cell => cell.includes('kurumsal') && (cell.includes('tutar') || cell.includes('fiyat')))
  if (corporatePriceIdx >= 0) return corporatePriceIdx
  const unitPriceIdx = normalizedRow.findIndex(cell => cell.includes('birim') && cell.includes('fiyat'))
  if (unitPriceIdx >= 0) return unitPriceIdx
  return -1
}
const findExcelHeader = (rows = []) => {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || []
    const normalizedRow = row.map(normalizeImportText)
    const classIndex = normalizedRow.findIndex(cell => cell.includes('sinif'))
    const productIndex = normalizedRow.findIndex(cell => cell.includes('urun') && (cell.includes('adi') || cell === 'urun'))
    const qtyCandidates = normalizedRow
      .map((cell, idx) => isExcelQtyHeader(cell) ? idx : -1)
      .filter(idx => idx >= 0)
    if (classIndex < 0 || productIndex < 0 || qtyCandidates.length === 0) continue
    const qtyIndex = qtyCandidates.find(idx => normalizedRow[idx].includes('siparis')) ?? qtyCandidates[0]
    const priceIndex = findExcelDiscountedPriceColumn(normalizedRow)
    const totalIndex = normalizedRow.findIndex(cell => cell.includes('toplam') && (cell.includes('tutar') || cell.includes('fiyat')))
    return { rowIndex, classIndex, productIndex, qtyIndex, priceIndex, totalIndex }
  }
  return null
}
const mapExcelGrade = (value) => {
  const normalized = normalizeImportText(value)
  if (!normalized) return null
  if (normalized.includes('okul oncesi')) return '5-6 Yaş'
  if (normalized.includes('4 yas')) return '4 Yaş'
  if (normalized.includes('5 6 yas') || normalized.includes('5-6')) return '5-6 Yaş'
  const gradeMatch = normalized.match(/([1-8])\s*\.?\s*sinif/)
  if (gradeMatch) return `${gradeMatch[1]}. Sınıf`
  return null
}
const extractPackageSizeFromName = (value) => {
  const normalized = normalizeImportText(value)
  if (!normalized) return null
  const match = normalized.match(/\b(\d{1,2})\b/)
  if (!match) return null
  const parsed = parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}
const findProductByExcelName = (excelProductName, products = []) => {
  const normalizedTarget = normalizeImportText(excelProductName)
  if (!normalizedTarget) return null
  const prepared = products
    .map(product => ({ product, normalized: normalizeImportText(product?.name) }))
    .filter(item => item.normalized)

  const exactMatch = prepared.find(item => item.normalized === normalizedTarget)
  if (exactMatch) return exactMatch.product

  const includeMatch = prepared.find(item => item.normalized.includes(normalizedTarget) || normalizedTarget.includes(item.normalized))
  if (includeMatch) return includeMatch.product
  const packageSize = extractPackageSizeFromName(excelProductName)
  if (packageSize) {
    const targetWantsStem = normalizedTarget.includes('stem')
    const targetWantsOrtaokul = normalizedTarget.includes('ortaokul')
    const packageCandidates = prepared.filter(item => {
      if (!item.normalized.includes(String(packageSize))) return false
      const isStem = item.normalized.includes('stem')
      const isOrtaokul = item.normalized.includes('ortaokul')
      if (targetWantsStem && !isStem) return false
      if (!targetWantsStem && isStem) return false
      if (targetWantsOrtaokul && !isOrtaokul) return false
      if (!targetWantsOrtaokul && isOrtaokul) return false
      return true
    })
    if (packageCandidates.length === 1) return packageCandidates[0].product
    if (packageCandidates.length > 1) {
      const bestByKeyword = packageCandidates.find(item => normalizedTarget.includes('kesif') && item.normalized.includes('kesif'))
      if (bestByKeyword) return bestByKeyword.product
      return packageCandidates
        .slice()
        .sort((a, b) => a.normalized.length - b.normalized.length)[0]
        .product
    }
  }

  const targetTokens = normalizedTarget.split(' ').filter(token => token.length > 2)
  if (targetTokens.length === 0) return null

  let best = null
  for (const item of prepared) {
    const candidateTokens = item.normalized.split(' ').filter(token => token.length > 2)
    const overlap = targetTokens.filter(token => candidateTokens.includes(token)).length
    if (!best || overlap > best.overlap) best = { product: item.product, overlap }
  }

  const requiredOverlap = targetTokens.length === 1 ? 1 : Math.min(targetTokens.length, 2)
  if (best && best.overlap >= requiredOverlap) return best.product
  return null
}
const parsePreOrderExcelRows = (rows = [], products = [], getPrice) => {
  const header = findExcelHeader(rows)
  if (!header) throw new Error('Excel içinde "Sınıf / Ürün Adı / Sipariş Adedi" başlıkları bulunamadı.')

  const schoolName = getExcelLabelValue(rows.slice(0, header.rowIndex + 1), ['kurum adi', 'okul adi'])
  const address = getExcelLabelValue(rows.slice(0, header.rowIndex + 1), ['adres bilgisi', 'adres'])

  const productDemandMap = new Map()
  const gradeQtyMap = new Map()
  let sourceLineCount = 0

  for (let rowIndex = header.rowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || []
    const classCell = String(row[header.classIndex] || '').trim()
    const productCell = String(row[header.productIndex] || '').trim()
    const qty = parseExcelQty(row[header.qtyIndex])
    const unitPriceFromExcel = header.priceIndex >= 0 ? parseExcelAmount(row[header.priceIndex]) : 0
    const rowTotalFromExcel = header.totalIndex >= 0 ? parseExcelAmount(row[header.totalIndex]) : null
    const classNormalized = normalizeImportText(classCell)

    if (classNormalized.includes('genel toplam')) break
    if (!classCell && !productCell && qty === 0) continue
    if (!productCell || qty <= 0) continue
    if (header.totalIndex >= 0 && (rowTotalFromExcel || 0) <= 0) continue

    sourceLineCount += 1
    const productKey = normalizeImportText(productCell) || `${productCell}-${rowIndex}`
    const currentProduct = productDemandMap.get(productKey) || { label: productCell, qty: 0, priceTotal: 0, priceQty: 0 }
    currentProduct.qty += qty
    if (unitPriceFromExcel > 0) {
      currentProduct.priceTotal += unitPriceFromExcel * qty
      currentProduct.priceQty += qty
    }
    productDemandMap.set(productKey, currentProduct)

    const mappedGrade = mapExcelGrade(classCell)
    if (mappedGrade) {
      const previousQty = gradeQtyMap.get(mappedGrade) || 0
      if (previousQty === 0) gradeQtyMap.set(mappedGrade, qty)
      else if (previousQty !== qty) gradeQtyMap.set(mappedGrade, previousQty + qty)
    }
  }

  if (productDemandMap.size === 0) throw new Error('Excelde geçerli ürün/adet satırı bulunamadı.')

  const unresolvedProducts = []
  const itemMap = new Map()
  for (const demand of productDemandMap.values()) {
    const matchedProduct = findProductByExcelName(demand.label, products)
    if (!matchedProduct) {
      unresolvedProducts.push(`${demand.label} (adet: ${demand.qty})`)
      continue
    }
    const current = itemMap.get(matchedProduct.id) || {
      product_id: String(matchedProduct.id),
      qty: 0,
      priceTotal: 0,
      priceQty: 0,
      fallbackUnitPrice: parseAmount(getPrice(matchedProduct.id)),
    }
    current.qty += demand.qty
    if ((demand.priceQty || 0) > 0) {
      current.priceTotal += demand.priceTotal || 0
      current.priceQty += demand.priceQty || 0
    }
    itemMap.set(matchedProduct.id, current)
  }

  const items = Array.from(itemMap.values())
    .map(item => {
      const unitPrice = item.priceQty > 0 ? item.priceTotal / item.priceQty : item.fallbackUnitPrice
      return {
        product_id: item.product_id,
        qty: String(item.qty),
        unit_price: Math.round((parseAmount(unitPrice) || 0) * 100) / 100,
      }
    })
    .sort((a, b) => parseInt(a.product_id, 10) - parseInt(b.product_id, 10))
  const classForecastRows = FORECAST_GRADES
    .map(grade => ({ grade, qty: gradeQtyMap.get(grade) || 0 }))
    .filter(row => row.qty > 0)
    .map(row => ({ grade: row.grade, qty: String(row.qty) }))
  const orderQtyTotal = items.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0)
  const forecastQtyTotal = classForecastRows.reduce((sum, row) => sum + (parseInt(row.qty, 10) || 0), 0)

  return { schoolName, address, items, classForecastRows, unresolvedProducts, sourceLineCount, orderQtyTotal, forecastQtyTotal }
}

export default function DealerPortal({ dealer, onLogout }) {
  const [page, setPage] = useState('dashboard')
  const [showGuide, setShowGuide] = useState(() => {
    try {
      return localStorage.getItem(DEALER_GUIDE_DISMISS_KEY) !== '1'
    } catch {
      return true
    }
  })
  const [orders, setOrders] = useState([])
  const [preOrders, setPreOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [checks, setChecks] = useState([])
  const [products, setProducts] = useState([])
  const [dealerPrices, setDealerPrices] = useState([])
  const [schoolForms, setSchoolForms] = useState([])
  const canUseFlexiblePrice = isMiniskopCenterDealer(dealer)
  const isMobile = useIsMobile(960)

  useEffect(() => { loadAll() }, [])
  useEffect(() => {
    const channel = supabase
      .channel(`dealer-live-${dealer.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `dealer_id=eq.${dealer.id}` }, () => { loadAll().catch(() => {}) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_orders', filter: `dealer_id=eq.${dealer.id}` }, () => { loadAll().catch(() => {}) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `dealer_id=eq.${dealer.id}` }, () => { loadAll().catch(() => {}) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checks', filter: `dealer_id=eq.${dealer.id}` }, () => { loadAll().catch(() => {}) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'school_forms', filter: `dealer_id=eq.${dealer.id}` }, () => { loadAll().catch(() => {}) })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [dealer.id])
  useEffect(() => {
    const timer = setInterval(() => { loadAll().catch(() => {}) }, 15000)
    return () => clearInterval(timer)
  }, [dealer.id])

  const loadAll = async () => {
    const [o, po, p, c, pr, dp, sf] = await Promise.all([
      supabase.from('orders').select('*').eq('dealer_id', dealer.id).order('created_at', { ascending: false }),
      supabase.from('pre_orders').select('*, pre_order_items(*)').eq('dealer_id', dealer.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('dealer_id', dealer.id).order('created_at', { ascending: false }),
      supabase.from('checks').select('*').eq('dealer_id', dealer.id).order('due_date'),
      supabase.from('products').select('*').order('id'),
      supabase.from('dealer_prices').select('*').eq('dealer_id', dealer.id),
      supabase.from('school_forms').select('*, school_form_items(*)').eq('dealer_id', dealer.id).order('created_at', { ascending: false }),
    ])
    if (o.data) setOrders(o.data)
    if (po.data) setPreOrders(po.data)
    if (p.data) setPayments(p.data)
    if (c.data) setChecks(c.data)
    if (pr.data) setProducts(pr.data)
    if (dp.data) setDealerPrices(dp.data)
    if (sf.data) setSchoolForms(sf.data)
  }

  const getPrice = (productId) => {
    const dp = dealerPrices.find(p => p.product_id === productId)
    if (dp) return dp.price
    const prod = products.find(p => p.id === productId)
    return prod?.default_price || 0
  }

  const createFormLink = async (po) => {
    // Zaten link var mı
    const existing = schoolForms.find(sf => sf.pre_order_id === po.id)
    if (existing) {
      const link = BASE_URL + '/form/' + existing.token
      navigator.clipboard.writeText(link).catch(() => {})
      alert('Link kopyalandı!\n\n' + link)
      window.open(link, '_blank', 'noopener,noreferrer')
      return
    }
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
    const formId = 'FORM-' + Date.now().toString().slice(-6)
    await supabase.from('school_forms').insert([{
      id: formId, pre_order_id: po.id, dealer_id: dealer.id, token, status: 'bekliyor', school_name: po.school_name
    }])
    const link = BASE_URL + '/form/' + token
    navigator.clipboard.writeText(link).catch(() => {})
    alert('Link oluşturuldu ve kopyalandı!\n\n' + link)
    window.open(link, '_blank', 'noopener,noreferrer')
    loadAll()
  }
  const updatePreOrder = async (preOrderId, preOrderPayload, itemsPayload) => {
    const current = preOrders.find(po => po.id === preOrderId)
    if (current && current.status !== 'on_siparis') {
      alert('Kesinleşen ön siparişler düzenlenemez.')
      return false
    }
    await supabase.from('pre_orders').update(preOrderPayload).eq('id', preOrderId)
    await supabase.from('pre_order_items').delete().eq('pre_order_id', preOrderId)
    if ((itemsPayload || []).length > 0) {
      await supabase.from('pre_order_items').insert(itemsPayload.map(item => ({
        pre_order_id: preOrderId,
        grade: '-',
        branch: '-',
        teacher: '-',
        product_id: parseInt(item.product_id),
        qty: parseInt(item.qty),
        unit_price: parseFloat(item.unit_price) || 0,
      })))
    }
    await loadAll()
    return true
  }
  const closeGuide = () => {
    setShowGuide(false)
    try {
      localStorage.setItem(DEALER_GUIDE_DISMISS_KEY, '1')
    } catch {}
  }
  const deletePreOrder = async (po) => {
    if (po.status !== 'on_siparis') {
      alert('Sadece kesinleşmemiş ön siparişler silinebilir.')
      return false
    }
    const linkedForm = schoolForms.find(sf => sf.pre_order_id === po.id)
    if (linkedForm && linkedForm.status !== 'bekliyor') {
      alert('Okul formu doldurulmuş veya onaylanmış sipariş silinemez.')
      return false
    }
    if (!window.confirm(`${po.school_name} için ön sipariş silinsin mi?`)) return false
    if (linkedForm) {
      await supabase.from('school_form_items').delete().eq('form_id', linkedForm.id)
      await supabase.from('school_forms').delete().eq('id', linkedForm.id)
    }
    await supabase.from('pre_order_items').delete().eq('pre_order_id', po.id)
    await supabase.from('pre_orders').delete().eq('id', po.id)
    await loadAll()
    return true
  }

  const approveForm = async (sf, po) => {
    if (!window.confirm('Bu formu onaylayıp siparişi kesinleştirmek istiyor musunuz?')) return
    const items = po?.pre_order_items || []
    const total = items.reduce((s, i) => s + ((i.qty || 0) * (i.unit_price || 0)), 0)
    const orderId = 'SIP-' + Date.now().toString().slice(-6)
    const schoolFormItems = sf?.school_form_items || []
    const classRows = schoolFormItems
      .filter(item => item.grade && item.grade !== ACTIVITY_MARKER_GRADE && item.grade !== PRODUCT_MARKER_GRADE && parseInt(item.qty) > 0)
      .map(item => ({
        order_id: orderId,
        grade: item.grade,
        branch: item.branch || '',
        teacher: item.teacher || '',
        qty: parseInt(item.qty) || 0,
      }))

    await supabase.from('orders').insert([{
      id: orderId, dealer_id: dealer.id, school_name: sf.school_name,
      season: po?.season, total, invoice_status: 'kesilmedi',
      dia_status: false, cargo_status: 'faturalanmadi', status: 'beklemede',
      cargo_fee: 0, free_qty: 0,
      note: 'Okul formu ile oluşturuldu'
    }])
    for (const item of items) {
      await supabase.from('order_items').insert([{ order_id: orderId, product_id: item.product_id, qty: item.qty, unit_price: item.unit_price, free_qty: 0 }])
    }
    const activityRows = [...new Set(
      schoolFormItems
        .filter(item => item.grade === ACTIVITY_MARKER_GRADE && item.branch && String(item.teacher || '').trim())
        .map(item => `${item.branch}:::${String(item.teacher || '').trim()}`)
    )].map(key => {
      const [level, activityName] = key.split(':::')
      return {
        order_id: orderId,
        grade: ACTIVITY_MARKER_GRADE,
        branch: level,
        teacher: activityName,
        qty: 0,
      }
    })
    const orderClassRows = [...classRows, ...activityRows]
    if (orderClassRows.length > 0) {
      await supabase.from('order_class_items').insert(orderClassRows)
    }
    const { data: freshDealer } = await supabase.from('dealers').select('balance').eq('id', dealer.id).single()
    await supabase.from('dealers').update({ balance: (freshDealer?.balance || 0) - total }).eq('id', dealer.id)
    await supabase.from('pre_orders').update({ status: 'siparise_donustu', cargo_fee: 0 }).eq('id', po.id)
    await supabase.from('school_forms').update({ status: 'onaylandi' }).eq('id', sf.id)
    loadAll()
    alert('Sipariş oluşturuldu: ' + orderId)
  }

  const NAV = [
    { id: 'dashboard', label: 'Özet' },
    { id: 'preorder', label: 'Ön Sipariş Ver' },
    { id: 'preorders', label: 'Ön Siparişlerim' },
    { id: 'orders', label: 'Siparişlerim' },
    { id: 'payments', label: 'Ödemelerim' },
    { id: 'checks', label: 'Çeklerim' },
  ]

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <button style={{ ...S.guideFab, top: isMobile ? 'auto' : 14, bottom: isMobile ? 14 : 'auto' }} onClick={() => setShowGuide(true)} title="Portal Kullanım Kılavuzu" aria-label="Portal Kullanım Kılavuzu">
        🧭
      </button>
      <div style={isMobile ? { ...S.header, padding: '12px 14px', flexDirection: 'column', alignItems: 'stretch', gap: 10 } : S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={kesifKutusuLogo} alt="Keşif Kutusu" style={{ width: 170, maxWidth: '42vw', height: 'auto' }} />
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 700 }}>Bayi Portalı</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
          <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{dealer.name}</div>
            <div style={{ fontSize: 12, color: (dealer.balance || 0) < 0 ? '#ffb3b3' : '#b3ffb3' }}>Bakiye: {fmt(dealer.balance)}</div>
          </div>
          <button onClick={onLogout} style={{ ...S.btn('rgba(255,255,255,0.2)'), fontSize: 12 }}>Çıkış</button>
        </div>
      </div>
      <div style={isMobile ? { ...S.nav, padding: '0 10px', overflowX: 'auto', gap: 4 } : S.nav}>
        {NAV.map(n => <div key={n.id} style={S.navItem(page === n.id, isMobile)} onClick={() => setPage(n.id)}>{n.label}</div>)}
      </div>
      <div style={isMobile ? { ...S.main, padding: '14px 12px' } : S.main}>
        <div className="portal-main-bg" style={{ backgroundImage: `url(${loginBg})`, opacity: 0.38 }} />
        <div className="portal-main-overlay" />
        <div className="portal-main-content">
          {page === 'dashboard' && <Dashboard dealer={dealer} orders={orders} payments={payments} checks={checks} preOrders={preOrders} schoolForms={schoolForms} isMobile={isMobile} />}
          {page === 'preorder' && <PreOrder dealer={dealer} products={products} getPrice={getPrice} loadAll={loadAll} isFlexiblePriceDealer={canUseFlexiblePrice} isMobile={isMobile} />}
          {page === 'preorders' && <PreOrders preOrders={preOrders} products={products} schoolForms={schoolForms} createFormLink={createFormLink} approveForm={approveForm} updatePreOrder={updatePreOrder} deletePreOrder={deletePreOrder} getPrice={getPrice} isFlexiblePriceDealer={canUseFlexiblePrice} isMobile={isMobile} />}
          {page === 'orders' && <Orders orders={orders} products={products} isMobile={isMobile} />}
          {page === 'payments' && <PaymentsView payments={payments} checks={checks} isMobile={isMobile} />}
          {page === 'checks' && <ChecksView checks={checks} isMobile={isMobile} />}
        </div>
      </div>
      <RoleGuideModal role="dealer" open={showGuide} onClose={closeGuide} />
    </div>
  )
}

function Dashboard({ dealer, orders, payments, checks, preOrders, schoolForms, isMobile }) {
  const pendingChecks = checks.filter(c => c.status !== 'tahsil_edildi')
  const pendingForms = schoolForms.filter(sf => sf.status === 'tamamlandi' || sf.status === 'okul_formu_guncelledi')

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 20 }}>Hoş geldiniz, {dealer.contact || dealer.name}!</h2>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ ...S.card, borderTop: '4px solid ' + COLORS.primary, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Bakiye</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: (dealer.balance || 0) < 0 ? COLORS.orange : COLORS.green, marginTop: 4 }}>{fmt(dealer.balance)}</div>
        </div>
        <div style={{ ...S.card, borderTop: '4px solid ' + COLORS.teal, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Toplam Sipariş</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.teal, marginTop: 4 }}>{orders.length}</div>
        </div>
        <div style={{ ...S.card, borderTop: '4px solid ' + COLORS.yellow, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Bekleyen Çek</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.yellow, marginTop: 4 }}>{pendingChecks.length}</div>
        </div>
        <div style={{ ...S.card, borderTop: '4px solid ' + COLORS.orange, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Onay Bekleyen Form</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.orange, marginTop: 4 }}>{pendingForms.length}</div>
        </div>
      </div>

      {pendingForms.length > 0 && (
        <div style={{ ...S.card, borderLeft: '4px solid ' + COLORS.orange }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.orange, marginBottom: 8 }}>📋 Onay Bekleyen Okul Formları</div>
          {pendingForms.map(sf => (
            <div key={sf.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', padding: '8px 0', borderBottom: '1px solid #f0e8ff', flexDirection: isMobile ? 'column' : 'row', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{sf.school_name}</span>
              <span style={S.badge(COLORS.orange)}>Onay Bekliyor</span>
            </div>
          ))}
        </div>
      )}

      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>Son Siparişler</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead><tr><th style={S.th}>Okul</th><th style={S.th}>Sezon</th><th style={S.th}>Tutar</th><th style={S.th}>Fatura</th></tr></thead>
          <tbody>{orders.slice(0, 5).map(o => (
            <tr key={o.id}>
              <td style={S.td}>{o.school_name || '-'}</td>
              <td style={S.td}>{o.season}</td>
              <td style={S.td}><strong>{fmt(getOrderTotalWithCargo(o))}</strong></td>
              <td style={S.td}><span style={S.badge(o.invoice_status === 'kesildi' ? COLORS.green : COLORS.orange)}>{o.invoice_status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function PreOrder({ dealer, products, getPrice, loadAll, isFlexiblePriceDealer, isMobile }) {
  const [schoolName, setSchoolName] = useState('')
  const [address, setAddress] = useState('')
  const [season, setSeason] = useState('2026-2027')
  const [note, setNote] = useState('')
  const [items, setItems] = useState([{ product_id: '', qty: '', unit_price: 0 }])
  const [classForecastRows, setClassForecastRows] = useState([{ grade: '1. Sınıf', qty: '' }])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [excelImportLoading, setExcelImportLoading] = useState(false)
  const [excelImportError, setExcelImportError] = useState('')
  const [excelImportSummary, setExcelImportSummary] = useState(null)
  const [excelBatchFiles, setExcelBatchFiles] = useState([])
  const [excelBatchLoading, setExcelBatchLoading] = useState(false)
  const [excelBatchError, setExcelBatchError] = useState('')
  const [excelBatchSummary, setExcelBatchSummary] = useState(null)

  const updateItem = (idx, field, value) => {
    setItems(prev => {
      if (field === 'product_id' && value) {
        const hasDuplicate = prev.some((row, rowIdx) => rowIdx !== idx && String(row.product_id || '') === String(value))
        if (hasDuplicate) {
          alert('Aynı ürün birden fazla satırda seçilemez.')
          return prev
        }
      }
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      if (field === 'product_id') next[idx].unit_price = getPrice(parseInt(value, 10))
      return next
    })
  }
  const updateClassForecast = (idx, field, value) => {
    setClassForecastRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const addItem = () => setItems(prev => [...prev, { product_id: '', qty: '', unit_price: 0 }])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))
  const addClassForecastRow = () => setClassForecastRows(prev => [...prev, { grade: FORECAST_GRADES[0], qty: '' }])
  const removeClassForecastRow = (idx) => setClassForecastRows(prev => prev.filter((_, i) => i !== idx))
  const filledItems = items.filter(i => i.product_id && parseInt(i.qty, 10) > 0)
  const validForecastRows = sanitizeForecastRows(classForecastRows)
  const total = items.reduce((sum, item) => sum + ((parseInt(item.qty, 10) || 0) * parseAmount(item.unit_price)), 0)
  const totalVat = getVatAmount(total)
  const totalWithVat = getAmountWithVat(total)
  const orderQtyTotal = filledItems.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0)
  const forecastQtyTotal = validForecastRows.reduce((sum, row) => sum + (row.qty || 0), 0)
  const hasDuplicateProductSelection = new Set(filledItems.map(item => String(item.product_id))).size !== filledItems.length
  const isForecastQtyMismatch = forecastQtyTotal !== orderQtyTotal
  const handleExcelImport = async (event) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''
    if (!selectedFile) return
    if (products.length === 0) {
      setExcelImportError('Ürün listesi henüz yüklenmedi. Lütfen tekrar deneyin.')
      return
    }

    setExcelImportLoading(true)
    setExcelImportError('')
    setExcelImportSummary(null)

    try {
      const xlsxModule = await import('xlsx')
      const XLSX = xlsxModule?.default && typeof xlsxModule.default.read === 'function' ? xlsxModule.default : xlsxModule
      const workbook = XLSX.read(await selectedFile.arrayBuffer(), { type: 'array', cellText: true, cellDates: false })
      const firstSheetName = workbook.SheetNames?.[0]
      if (!firstSheetName) throw new Error('Excel içinde okunabilir sayfa bulunamadı.')

      const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1, raw: false, defval: '' })
      const parsed = parsePreOrderExcelRows(sheetRows, products, getPrice)

      if (parsed.unresolvedProducts.length > 0) {
        const visibleItems = parsed.unresolvedProducts.slice(0, 3).join(', ')
        const extraCount = parsed.unresolvedProducts.length > 3 ? ` +${parsed.unresolvedProducts.length - 3} ürün` : ''
        throw new Error(`Exceldeki bazı ürünler bulunamadı: ${visibleItems}${extraCount}. Lütfen ürün adlarını kontrol edin.`)
      }
      if (parsed.items.length === 0) throw new Error('Excelde eşleşen ürün bulunamadı.')
      if (parsed.classForecastRows.length === 0) throw new Error('Excelden sınıf dağılımı çıkarılamadı.')
      if (parsed.orderQtyTotal !== parsed.forecastQtyTotal) {
        throw new Error(`Excel toplamları eşleşmiyor. Ürün adedi: ${parsed.orderQtyTotal}, sınıf toplamı: ${parsed.forecastQtyTotal}.`)
      }

      setItems(parsed.items)
      setClassForecastRows(parsed.classForecastRows)
      if (parsed.schoolName) setSchoolName(parsed.schoolName)
      if (parsed.address) setAddress(parsed.address)
      setExcelImportSummary({
        fileName: selectedFile.name,
        rowCount: parsed.sourceLineCount,
        productCount: parsed.items.length,
        qtyTotal: parsed.orderQtyTotal,
        forecastTotal: parsed.forecastQtyTotal,
      })
    } catch (error) {
      setExcelImportError(error?.message || 'Excel dosyası okunamadı.')
    } finally {
      setExcelImportLoading(false)
    }
  }
  const handleExcelBatchSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || []).filter(file => /\.(xlsx|xls)$/i.test(file.name || ''))
    event.target.value = ''
    if (selectedFiles.length === 0) {
      setExcelBatchFiles([])
      setExcelBatchError('Geçerli Excel dosyası seçilmedi.')
      setExcelBatchSummary(null)
      return
    }
    if (selectedFiles.length > 5) {
      setExcelBatchFiles(selectedFiles.slice(0, 5))
      setExcelBatchError('Aynı anda en fazla 5 Excel dosyası seçebilirsiniz.')
      setExcelBatchSummary(null)
      return
    }
    setExcelBatchFiles(selectedFiles)
    setExcelBatchError('')
    setExcelBatchSummary(null)
  }

  const createBatchPreOrdersFromExcel = async () => {
    if (excelBatchFiles.length === 0) {
      alert('Lütfen en az bir Excel dosyası seçiniz.')
      return
    }
    if (products.length === 0) {
      setExcelBatchError('Ürün listesi henüz yüklenmedi. Lütfen tekrar deneyin.')
      return
    }
    setExcelBatchLoading(true)
    setExcelBatchError('')
    setExcelBatchSummary(null)
    try {
      const xlsxModule = await import('xlsx')
      const XLSX = xlsxModule?.default && typeof xlsxModule.default.read === 'function' ? xlsxModule.default : xlsxModule
      const parsedRowsByFile = []
      const parseErrors = []

      for (const file of excelBatchFiles) {
        try {
          const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellText: true, cellDates: false })
          const firstSheetName = workbook.SheetNames?.[0]
          if (!firstSheetName) throw new Error('Excel içinde okunabilir sayfa bulunamadı.')
          const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1, raw: false, defval: '' })
          const parsed = parsePreOrderExcelRows(sheetRows, products, getPrice)
          if (parsed.unresolvedProducts.length > 0) {
            const visibleItems = parsed.unresolvedProducts.slice(0, 3).join(', ')
            const extraCount = parsed.unresolvedProducts.length > 3 ? ` +${parsed.unresolvedProducts.length - 3} ürün` : ''
            throw new Error(`Eşleşmeyen ürünler: ${visibleItems}${extraCount}`)
          }
          if (parsed.items.length === 0) throw new Error('Eşleşen ürün bulunamadı.')
          if (parsed.classForecastRows.length === 0) throw new Error('Sınıf dağılımı çıkarılamadı.')
          if (parsed.orderQtyTotal !== parsed.forecastQtyTotal) {
            throw new Error(`Ürün adedi (${parsed.orderQtyTotal}) ve sınıf toplamı (${parsed.forecastQtyTotal}) eşit değil.`)
          }
          const parsedSchoolName = String(parsed.schoolName || '').trim()
          if (!parsedSchoolName) throw new Error('Kurum adı bulunamadı.')
          parsedRowsByFile.push({
            fileName: file.name,
            schoolName: parsedSchoolName,
            address: String(parsed.address || '').trim(),
            items: parsed.items,
            classForecastRows: parsed.classForecastRows,
            orderQtyTotal: parsed.orderQtyTotal,
          })
        } catch (error) {
          parseErrors.push(`${file.name}: ${error?.message || 'Excel okunamadı'}`)
        }
      }

      if (parseErrors.length > 0) {
        throw new Error(parseErrors.join(' | '))
      }

      const preOrdersPayload = parsedRowsByFile.map((row, idx) => ({
        id: generatePreOrderId(idx),
        dealer_id: dealer.id,
        school_name: row.schoolName,
        address: row.address,
        season,
        note: buildPreOrderNote(`Toplu Excel: ${row.fileName}`, row.classForecastRows),
        status: 'on_siparis',
      }))
      const preOrderItemsPayload = preOrdersPayload.flatMap((preOrder, idx) => {
        const row = parsedRowsByFile[idx]
        return row.items.map(item => ({
          pre_order_id: preOrder.id,
          grade: '-',
          branch: '-',
          teacher: '-',
          product_id: parseInt(item.product_id, 10),
          qty: parseInt(item.qty, 10),
          unit_price: parseAmount(item.unit_price),
        }))
      })

      const { error: preOrdersInsertError } = await supabase.from('pre_orders').insert(preOrdersPayload)
      if (preOrdersInsertError) throw new Error(preOrdersInsertError.message || 'Toplu ön sipariş kaydedilemedi.')
      const { error: preOrderItemsInsertError } = await supabase.from('pre_order_items').insert(preOrderItemsPayload)
      if (preOrderItemsInsertError) {
        await supabase.from('pre_orders').delete().in('id', preOrdersPayload.map(item => item.id))
        throw new Error(preOrderItemsInsertError.message || 'Toplu ön sipariş kalemleri kaydedilemedi.')
      }

      setSubmitted(true)
      setExcelBatchSummary({
        createdCount: preOrdersPayload.length,
        totalQty: parsedRowsByFile.reduce((sum, row) => sum + (row.orderQtyTotal || 0), 0),
        files: parsedRowsByFile.map(row => ({ fileName: row.fileName, schoolName: row.schoolName, qty: row.orderQtyTotal })),
      })
      setExcelBatchFiles([])
      setExcelImportError('')
      setExcelImportSummary(null)
      await loadAll()
      setTimeout(() => setSubmitted(false), 3000)
    } catch (error) {
      setExcelBatchError(error?.message || 'Toplu Excel işleme başarısız oldu.')
    } finally {
      setExcelBatchLoading(false)
    }
  }

  const save = async () => {
    if (!schoolName || filledItems.length === 0) return
    if (validForecastRows.length === 0) {
      alert('Ön görülen sınıf dağılımı zorunludur.')
      return
    }
    if (hasDuplicateProductSelection) {
      alert('Aynı ürün birden fazla satırda seçilemez.')
      return
    }
    if (isForecastQtyMismatch) {
      alert(`Sipariş adedi (${orderQtyTotal}) ile ön görülen sınıf toplamı (${forecastQtyTotal}) eşit olmalıdır.`)
      return
    }
    setLoading(true)
    const preOrderId = generatePreOrderId()
    const noteWithForecast = buildPreOrderNote(note, validForecastRows)
    await supabase.from('pre_orders').insert([{ id: preOrderId, dealer_id: dealer.id, school_name: schoolName, address, season, note: noteWithForecast, status: 'on_siparis' }])
    await supabase.from('pre_order_items').insert(filledItems.map(item => ({
      pre_order_id: preOrderId, grade: '-', branch: '-', teacher: '-',
      product_id: parseInt(item.product_id, 10), qty: parseInt(item.qty, 10), unit_price: parseAmount(item.unit_price),
    })))
    setSubmitted(true)
    setExcelBatchSummary(null)
    setLoading(false)
    setSchoolName('')
    setAddress('')
    setNote('')
    setItems([{ product_id: '', qty: '', unit_price: 0 }])
    setClassForecastRows([{ grade: '1. Sınıf', qty: '' }])
    loadAll()
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 20 }}>Ön Sipariş Ver</h2>
      {submitted && (
        <div style={{ background: COLORS.green + '22', border: '2px solid ' + COLORS.green, borderRadius: 10, padding: 16, marginBottom: 20, color: COLORS.green, fontWeight: 700, textAlign: 'center' }}>
          {excelBatchSummary?.createdCount > 1
            ? `${excelBatchSummary.createdCount} ön sipariş toplu olarak oluşturuldu!`
            : 'Ön siparişimiz alındı! Ön Siparişlerim bölümünden link oluşturabilirsiniz.'}
        </div>
      )}
      <div style={S.card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 8 }}>Excel'den Otomatik Ön Sipariş</div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          Şablondaki <strong>SINIF</strong>, <strong>ÜRÜN ADI</strong>, <strong>SİPARİŞ ADEDİ</strong> sütunları okunur ve form otomatik doldurulur.
        </div>
        <input
          type="file"
          accept=".xlsx,.xls"
          data-testid="excel-single-input"
          style={S.input}
          onChange={handleExcelImport}
          disabled={excelImportLoading || excelBatchLoading}
        />
        {excelImportLoading && (
          <div style={{ marginTop: 10, fontSize: 12, color: COLORS.primary, fontWeight: 700 }}>
            Excel okunuyor, lütfen bekleyin...
          </div>
        )}
        {excelImportError && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#b91c1c', background: '#fee2e2', borderRadius: 8, padding: '8px 10px', fontWeight: 600 }}>
            {excelImportError}
          </div>
        )}
        {excelImportSummary && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#166534', background: '#dcfce7', borderRadius: 8, padding: '8px 10px', display: 'grid', gap: 4 }}>
            <div><strong>Dosya:</strong> {excelImportSummary.fileName}</div>
            <div><strong>Okunan satır:</strong> {excelImportSummary.rowCount}</div>
            <div><strong>Eşleşen ürün:</strong> {excelImportSummary.productCount}</div>
            <div><strong>Ürün adedi toplamı:</strong> {excelImportSummary.qtyTotal} • <strong>Sınıf toplamı:</strong> {excelImportSummary.forecastTotal}</div>
          </div>
        )}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #e6ddff' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>Toplu Excel ile Ön Sipariş (en fazla 5 dosya)</div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
            Seçilen her Excel dosyası için tek seferde ayrı ön sipariş oluşturulur.
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            data-testid="excel-batch-input"
            style={S.input}
            onChange={handleExcelBatchSelection}
            disabled={excelBatchLoading || excelImportLoading}
          />
          {excelBatchFiles.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#555' }}>
              Seçilen dosyalar: {excelBatchFiles.map(file => file.name).join(', ')}
            </div>
          )}
          <div style={{ marginTop: 10, display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
            <button
              type="button"
              data-testid="excel-batch-create-button"
              style={{ ...S.btn(COLORS.orange), width: isMobile ? '100%' : 'auto' }}
              onClick={createBatchPreOrdersFromExcel}
              disabled={excelBatchLoading || excelImportLoading || excelBatchFiles.length === 0}
            >
              {excelBatchLoading ? 'Toplu oluşturuluyor...' : 'Toplu Ön Sipariş Oluştur'}
            </button>
          </div>
          {excelBatchError && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#b91c1c', background: '#fee2e2', borderRadius: 8, padding: '8px 10px', fontWeight: 600 }}>
              {excelBatchError}
            </div>
          )}
          {excelBatchSummary && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#166534', background: '#dcfce7', borderRadius: 8, padding: '8px 10px', display: 'grid', gap: 4 }}>
              <div><strong>Oluşturulan ön sipariş:</strong> {excelBatchSummary.createdCount}</div>
              <div><strong>Toplam ürün adedi:</strong> {excelBatchSummary.totalQty}</div>
              <div><strong>Dosyalar:</strong> {excelBatchSummary.files.map(file => `${file.fileName} → ${file.schoolName} (${file.qty})`).join(' • ')}</div>
            </div>
          )}
        </div>
      </div>
      <div style={S.card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>Kurum Bilgileri</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label style={S.label}>Kurum Adı *</label><input style={S.input} value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="Okul / Kurum adı" /></div>
          <div><label style={S.label}>Sezon</label><select style={S.select} value={season} onChange={e => setSeason(e.target.value)}><option>2025-2026</option><option>2026-2027</option></select></div>
        </div>
        <div><label style={S.label}>Adres</label><input style={S.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="Kurum adresi" /></div>
      </div>
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16, gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>Ürün ve Adet Bilgileri</div>
          {isFlexiblePriceDealer && <span style={S.badge(COLORS.orange)}>Miniskop Merkez için esnek fiyat açık</span>}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr style={{ background: COLORS.primary + '11' }}>
            <th style={S.th}>Ürün</th>
            <th style={{ ...S.th, width: 140 }}>Birim Fiyat</th>
            <th style={{ ...S.th, width: 100 }}>Toplam Adet</th>
            <th style={{ ...S.th, width: 120 }}>Toplam</th>
            <th style={{ ...S.th, width: 40 }}></th>
          </tr></thead>
          <tbody>{items.map((item, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#faf6ff' }}>
              <td style={S.td}><select style={S.select} value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}><option value="">Seçiniz...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
              <td style={S.td}>
                {isFlexiblePriceDealer ? (
                  <input type="number" min="0" style={{ ...S.input, textAlign: 'right' }} value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                ) : (
                  <div style={{ textAlign: 'right', fontWeight: 600 }}>{parseAmount(item.unit_price) > 0 ? fmt(item.unit_price) : '-'}</div>
                )}
              </td>
              <td style={S.td}><input type="number" min="0" style={{ ...S.input, textAlign: 'center' }} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} placeholder="0" /></td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: (parseInt(item.qty, 10) || 0) > 0 ? COLORS.primary : '#ccc' }}>{(parseInt(item.qty, 10) || 0) > 0 ? fmt((parseInt(item.qty, 10) || 0) * parseAmount(item.unit_price)) : '-'}</td>
              <td style={S.td}>{idx > 0 && <button style={{ ...S.btn('#ef4444'), padding: '4px 8px', fontSize: 12 }} onClick={() => removeItem(idx)}>✕</button>}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{ background: COLORS.primary + '11' }}>
            <td colSpan={3} style={{ ...S.td, fontWeight: 800, textAlign: 'right', color: COLORS.primary }}>GENEL TOPLAM:</td>
            <td style={{ ...S.td, fontWeight: 800, fontSize: 16, color: COLORS.primary, textAlign: 'right' }}>{fmt(total)}</td>
            <td style={S.td}></td>
          </tr></tfoot>
        </table>
        <div style={{ marginTop: 12 }}>
          <button style={{ ...S.btn(COLORS.teal), fontSize: 12 }} onClick={addItem}>+ Ürün Ekle</button>
        </div>
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: '#f8f4ff', display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 12, color: '#666' }}>KDV Hariç Toplam: <strong style={{ color: COLORS.primary }}>{fmt(total)}</strong></div>
          <div style={{ fontSize: 12, color: '#666' }}>KDV (1/3'e %20): <strong style={{ color: COLORS.orange }}>{fmt(totalVat)}</strong></div>
          <div style={{ fontSize: 13, color: '#333', fontWeight: 800 }}>KDV Dahil Toplam: <span style={{ color: COLORS.green }}>{fmt(totalWithVat)}</span></div>
        </div>
      </div>
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 12, gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>Ön Görülen Sınıf Dağılımı</div>
          <button style={{ ...S.btn(COLORS.teal), fontSize: 12, padding: '7px 14px' }} onClick={addClassForecastRow}>+ Sınıf Satırı</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead><tr><th style={S.th}>Sınıf</th><th style={S.th}>Adet</th><th style={{ ...S.th, width: 40 }}></th></tr></thead>
          <tbody>{classForecastRows.map((row, idx) => (
            <tr key={`forecast-row-${idx}`}>
              <td style={S.td}>
                <select style={S.select} value={row.grade} onChange={e => updateClassForecast(idx, 'grade', e.target.value)}>
                  {FORECAST_GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                </select>
              </td>
              <td style={S.td}><input type="number" min="0" style={{ ...S.input, textAlign: 'center' }} value={row.qty} onChange={e => updateClassForecast(idx, 'qty', e.target.value)} /></td>
              <td style={S.td}>{idx > 0 && <button style={{ ...S.btn('#ef4444'), padding: '4px 8px', fontSize: 12 }} onClick={() => removeClassForecastRow(idx)}>✕</button>}</td>
            </tr>
          ))}</tbody>
          <tfoot>
            <tr style={{ background: '#f8f4ff' }}>
              <td style={{ ...S.td, fontWeight: 700, textAlign: 'right' }}>Toplam</td>
              <td style={{ ...S.td, fontWeight: 700, color: forecastQtyTotal === orderQtyTotal ? COLORS.green : COLORS.orange }}>{forecastQtyTotal}</td>
              <td style={S.td}></td>
            </tr>
          </tfoot>
        </table>
        <div style={{ marginTop: 10, fontSize: 12, color: forecastQtyTotal === orderQtyTotal ? COLORS.green : COLORS.orange }}>
          Sipariş adedi: <strong>{orderQtyTotal}</strong> • Ön görülen sınıf toplamı: <strong>{forecastQtyTotal}</strong>
        </div>
        {isForecastQtyMismatch && (
          <div style={{ marginTop: 8, fontSize: 12, color: COLORS.orange, fontWeight: 700 }}>
            Ön sipariş göndermek için sipariş adedi ile ön görülen sınıf toplamı eşit olmalıdır.
          </div>
        )}
        {hasDuplicateProductSelection && (
          <div style={{ marginTop: 6, fontSize: 12, color: COLORS.orange, fontWeight: 700 }}>
            Aynı ürün birden fazla satırda seçilemez.
          </div>
        )}
      </div>
      <div style={S.card}>
        <label style={S.label}>Not</label>
        <input style={S.input} value={note} onChange={e => setNote(e.target.value)} placeholder="Not..." />
      </div>
      <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
        <button style={{ ...S.btn(COLORS.primary), width: isMobile ? '100%' : 'auto' }} onClick={save} disabled={loading || !schoolName || filledItems.length === 0 || validForecastRows.length === 0 || hasDuplicateProductSelection || isForecastQtyMismatch}>
          {loading ? 'Gönderiliyor...' : 'Ön Sipariş Gönder'}
        </button>
      </div>
    </div>
  )
}

function PreOrders({ preOrders, products, schoolForms, createFormLink, approveForm, updatePreOrder, deletePreOrder, getPrice, isFlexiblePriceDealer, isMobile }) {
  const emptyItem = { product_id: '', qty: '', unit_price: 0 }
  const [detail, setDetail] = useState(null)
  const [formDetail, setFormDetail] = useState(null)
  const [editModal, setEditModal] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editingPreOrder, setEditingPreOrder] = useState(null)
  const [editForm, setEditForm] = useState({ school_name: '', address: '', season: '2026-2027', note: '' })
  const [editItems, setEditItems] = useState([{ ...emptyItem }])
  const [editClassForecast, setEditClassForecast] = useState([{ grade: FORECAST_GRADES[0], qty: '' }])
  const [filters, setFilters] = useState({ id: '', school: '', season: '', total: '', formStatus: '', status: '' })
  const getFormClassRows = (schoolForm) => (schoolForm?.school_form_items || []).filter(item => item.grade !== '__URUN__' && item.grade !== '__ETKINLIK__')
  const getFormActivitiesByLevel = (schoolForm) => (schoolForm?.school_form_items || [])
    .filter(item => item.grade === '__ETKINLIK__')
    .reduce((acc, item) => {
      const level = item.branch
      const activityName = (item.teacher || '').trim()
      const activityCount = Math.max(parseInt(item.qty, 10) || 0, 1)
      if (!level || !activityName) return acc
      if (!acc[level]) acc[level] = {}
      acc[level][activityName] = (acc[level][activityName] || 0) + activityCount
      return acc
    }, {})
  const toActivityDisplay = (activityMapByLevel = {}) => Object.fromEntries(
    Object.entries(activityMapByLevel).map(([level, activityMap]) => [
      level,
      Object.entries(activityMap || {}).map(([name, count]) => count > 1 ? `${name} (x${count})` : name)
    ])
  )
  const formLinkedPreOrder = formDetail ? preOrders.find(po => po.id === formDetail.pre_order_id) : null
  const detailLinkedForm = detail ? schoolForms.find(sf => sf.pre_order_id === detail.id) : null
  const formClassRows = getFormClassRows(formDetail)
  const formActivitiesByLevel = toActivityDisplay(getFormActivitiesByLevel(formDetail))
  const detailFormClassRows = getFormClassRows(detailLinkedForm)
  const detailFormActivitiesByLevel = toActivityDisplay(getFormActivitiesByLevel(detailLinkedForm))
  const detailNoteData = splitPreOrderNote(detail?.note || '')
  const detailForecastRows = detailNoteData.forecastRows
  const detailTeacherSetQty = 0
  const detailCargoFee = parseAmount(detail?.cargo_fee) > 0
    ? parseAmount(detail?.cargo_fee)
    : 0 // automatic cargo calculation disabled
  const downloadApprovedForm = (schoolForm) => {
    downloadSchoolFormReport({
      form: schoolForm,
      classRows: getFormClassRows(schoolForm),
      activitiesByLevel: toActivityDisplay(getFormActivitiesByLevel(schoolForm)),
      filenamePrefix: 'onayli-okul-formu',
    })
  }

  const STATUS = {
    on_siparis: { label: 'Bekliyor', color: COLORS.orange },
    kesinlesti: { label: 'Kesinleşti (Bayi)', color: COLORS.primary },
    siparise_donustu: { label: 'Kesinleşti', color: COLORS.green },
    iptal: { label: 'İptal', color: '#aaa' }
  }

  const FORM_STATUS = {
    bekliyor: { label: 'Form Gönderilmedi', color: '#aaa' },
    tamamlandi: { label: 'Okul Doldurdu', color: COLORS.orange },
    okul_formu_guncelledi: { label: 'Okul Formu Güncelledi', color: COLORS.pink },
    onaylandi: { label: 'Onaylandı', color: COLORS.green }
  }
  const normalizeText = (value) => String(value || '').toLocaleLowerCase('tr-TR')
  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))
  const filteredPreOrders = preOrders.filter(po => {
    const items = po.pre_order_items || []
    const total = items.reduce((s, i) => s + ((i.qty || 0) * (i.unit_price || 0)), 0)
    const totalWithVat = getAmountWithVat(total)
    const sf = schoolForms.find(form => form.pre_order_id === po.id)
    const formStatusLabel = sf ? (FORM_STATUS[sf.status]?.label || sf.status || '') : 'Form Yok'
    const statusLabel = STATUS[po.status]?.label || po.status || ''
    const totalDisplay = fmt(totalWithVat)
    const totalRaw = String(totalWithVat || 0)

    if (filters.id && !normalizeText(po.id).includes(normalizeText(filters.id))) return false
    if (filters.school && !normalizeText(po.school_name).includes(normalizeText(filters.school))) return false
    if (filters.season && !normalizeText(po.season).includes(normalizeText(filters.season))) return false
    if (filters.total && !normalizeText(totalDisplay).includes(normalizeText(filters.total)) && !normalizeText(totalRaw).includes(normalizeText(filters.total))) return false
    if (filters.formStatus && !normalizeText(formStatusLabel).includes(normalizeText(filters.formStatus))) return false
    if (filters.status && !normalizeText(statusLabel).includes(normalizeText(filters.status))) return false
    return true
  })
  const filteredTotal = filteredPreOrders.reduce((sum, po) => {
    const items = po.pre_order_items || []
    return sum + items.reduce((s, i) => s + ((i.qty || 0) * (i.unit_price || 0)), 0)
  }, 0)
  const getPreOrderTeacherSetQty = () => 0
  const filteredTotalWithVat = getAmountWithVat(filteredTotal)
  const filteredCargoTotal = filteredPreOrders.reduce((sum, po) => sum + getPreOrderCargoFee(po), 0)
  const filteredGrandTotal = filteredTotalWithVat + filteredCargoTotal
  const filteredTeacherSetTotal = filteredPreOrders.reduce((sum, po) => sum + getPreOrderTeacherSetQty(po), 0)
  const openEdit = (po) => {
    const { userNote, forecastRows } = splitPreOrderNote(po.note)
    setEditingPreOrder(po)
    setEditForm({
      school_name: po.school_name || '',
      address: po.address || '',
      season: po.season || '2026-2027',
      note: userNote,
    })
    setEditClassForecast(forecastRows.length > 0 ? forecastRows : [{ grade: FORECAST_GRADES[0], qty: '' }])
    const mappedItems = (po.pre_order_items || []).map(item => ({
      product_id: String(item.product_id || ''),
      qty: String(item.qty || ''),
      unit_price: item.unit_price || 0,
    }))
    setEditItems(mappedItems.length > 0 ? mappedItems : [{ ...emptyItem }])
    setEditModal(true)
  }
  const updateEditItem = (idx, field, value) => {
    setEditItems(prev => {
      if (field === 'product_id' && value) {
        const hasDuplicate = prev.some((row, rowIdx) => rowIdx !== idx && String(row.product_id || '') === String(value))
        if (hasDuplicate) {
          alert('Aynı ürün birden fazla satırda seçilemez.')
          return prev
        }
      }
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      if (field === 'product_id') next[idx].unit_price = getPrice(parseInt(value))
      return next
    })
  }
  const addEditItem = () => setEditItems(prev => [...prev, { ...emptyItem }])
  const removeEditItem = (idx) => setEditItems(prev => {
    const next = prev.filter((_, i) => i !== idx)
    return next.length > 0 ? next : [{ ...emptyItem }]
  })
  const addEditClassForecastRow = () => setEditClassForecast(prev => [...prev, { grade: FORECAST_GRADES[0], qty: '' }])
  const removeEditClassForecastRow = (idx) => setEditClassForecast(prev => {
    const next = prev.filter((_, i) => i !== idx)
    return next.length > 0 ? next : [{ grade: FORECAST_GRADES[0], qty: '' }]
  })
  const updateEditClassForecast = (idx, field, value) => {
    setEditClassForecast(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }
  const filledEditItems = editItems.filter(item => item.product_id && parseInt(item.qty) > 0)
  const validEditClassForecast = sanitizeForecastRows(editClassForecast)
  const editTotal = filledEditItems.reduce((s, i) => s + ((parseInt(i.qty) || 0) * (i.unit_price || 0)), 0)
  const editOrderQtyTotal = filledEditItems.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0)
  const editForecastQtyTotal = validEditClassForecast.reduce((sum, row) => sum + (row.qty || 0), 0)
  const hasDuplicateEditProducts = new Set(filledEditItems.map(item => String(item.product_id))).size !== filledEditItems.length
  const isEditForecastMismatch = editForecastQtyTotal !== editOrderQtyTotal
  const saveEditedPreOrder = async () => {
    if (!editingPreOrder) return
    if (!editForm.school_name || filledEditItems.length === 0) {
      alert('Kurum adı ve en az bir ürün zorunludur.')
      return
    }
    if (validEditClassForecast.length === 0) {
      alert('Ön görülen sınıf dağılımı zorunludur.')
      return
    }
    if (hasDuplicateEditProducts) {
      alert('Aynı ürün birden fazla satırda seçilemez.')
      return
    }
    if (isEditForecastMismatch) {
      alert(`Sipariş adedi (${editOrderQtyTotal}) ile ön görülen sınıf toplamı (${editForecastQtyTotal}) eşit olmalıdır.`)
      return
    }
    setEditSaving(true)
    try {
      const updated = await updatePreOrder(editingPreOrder.id, {
        school_name: editForm.school_name,
        address: editForm.address,
        season: editForm.season,
        note: buildPreOrderNote(editForm.note, validEditClassForecast),
      }, filledEditItems)
      if (!updated) return
      setEditModal(false)
      setEditingPreOrder(null)
      if (detail?.id === editingPreOrder.id) setDetail(null)
    } finally {
      setEditSaving(false)
    }
  }
  const handleDelete = async (po) => {
    const deleted = await deletePreOrder(po)
    if (deleted && detail?.id === po.id) setDetail(null)
  }
  const sharedFormRows = schoolForms.flatMap(form => {
    const linkedPreOrder = preOrders.find(po => po.id === form.pre_order_id)
    const classRows = getFormClassRows(form)
    const activitiesByLevel = toActivityDisplay(getFormActivitiesByLevel(form))
    const activitiesText = Object.entries(activitiesByLevel).map(([level, activities]) => `${level}: ${activities.join(', ')}`).join(' | ')
    const productsText = (linkedPreOrder?.pre_order_items || [])
      .map(item => `${products.find(p => p.id === item.product_id)?.name || '-'} x${item.qty || 0}`)
      .join(', ')
    if (classRows.length === 0) {
      return [{
        form_id: form.id,
        pre_order_id: linkedPreOrder?.id || form.pre_order_id || '-',
        school_name: form.school_name || linkedPreOrder?.school_name || '-',
        season: linkedPreOrder?.season || '-',
        status: FORM_STATUS[form.status]?.label || form.status || '-',
        grade: '-',
        branch: '-',
        teacher: '-',
        teacher_email: '-',
        teacher_phone: '-',
        qty: 0,
        activities_text: activitiesText || '-',
        products_text: productsText || '-',
      }]
    }
    return classRows.map(row => ({
      form_id: form.id,
      pre_order_id: linkedPreOrder?.id || form.pre_order_id || '-',
      school_name: form.school_name || linkedPreOrder?.school_name || '-',
      season: linkedPreOrder?.season || '-',
      status: FORM_STATUS[form.status]?.label || form.status || '-',
      grade: row.grade || '-',
      branch: row.branch || '-',
      teacher: row.teacher || '-',
      teacher_email: row.teacher_email || '-',
      teacher_phone: row.teacher_phone || '-',
      qty: row.qty || 0,
      activities_text: activitiesText || '-',
      products_text: productsText || '-',
    }))
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <h2 style={{ color: COLORS.primary, marginBottom: 0 }}>Ön Siparişlerim</h2>
        <span style={{ ...S.badge(COLORS.teal), alignSelf: isMobile ? 'flex-start' : 'center' }}>Ortak e-tablo: {sharedFormRows.length} satır</span>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
          <thead>
            <tr>
              <th style={S.th}>No</th><th style={S.th}>Okul</th><th style={S.th}>Sezon</th><th style={S.th}>Toplam (KDV Dahil)</th><th style={S.th}>Form Durumu</th><th style={S.th}>Durum</th><th style={S.th}></th>
            </tr>
            <tr style={{ background: '#faf6ff' }}>
              <th style={{ ...S.td, padding: 8 }}><input style={{ ...S.input, padding: '6px 8px', fontSize: 12, borderWidth: 1 }} placeholder="Filtre..." value={filters.id} onChange={e => updateFilter('id', e.target.value)} /></th>
              <th style={{ ...S.td, padding: 8 }}><input style={{ ...S.input, padding: '6px 8px', fontSize: 12, borderWidth: 1 }} placeholder="Filtre..." value={filters.school} onChange={e => updateFilter('school', e.target.value)} /></th>
              <th style={{ ...S.td, padding: 8 }}><input style={{ ...S.input, padding: '6px 8px', fontSize: 12, borderWidth: 1 }} placeholder="Filtre..." value={filters.season} onChange={e => updateFilter('season', e.target.value)} /></th>
              <th style={{ ...S.td, padding: 8 }}><input style={{ ...S.input, padding: '6px 8px', fontSize: 12, borderWidth: 1 }} placeholder="Filtre..." value={filters.total} onChange={e => updateFilter('total', e.target.value)} /></th>
              <th style={{ ...S.td, padding: 8 }}><input style={{ ...S.input, padding: '6px 8px', fontSize: 12, borderWidth: 1 }} placeholder="Filtre..." value={filters.formStatus} onChange={e => updateFilter('formStatus', e.target.value)} /></th>
              <th style={{ ...S.td, padding: 8 }}><input style={{ ...S.input, padding: '6px 8px', fontSize: 12, borderWidth: 1 }} placeholder="Filtre..." value={filters.status} onChange={e => updateFilter('status', e.target.value)} /></th>
              <th style={{ ...S.td, padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>{filteredPreOrders.length === 0 ? (
            <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 32 }}>Kayıt bulunamadı</td></tr>
          ) : filteredPreOrders.map(po => {
            const items = po.pre_order_items || []
            const total = items.reduce((s, i) => s + ((i.qty || 0) * (i.unit_price || 0)), 0)
            const totalWithVat = getAmountWithVat(total)
            const sf = schoolForms.find(form => form.pre_order_id === po.id)
            const isEditable = po.status === 'on_siparis'
            const canManageForm = po.status === 'on_siparis' || po.status === 'kesinlesti'
            const cargoFee = getPreOrderCargoFee(po)
            const teacherSetQty = getPreOrderTeacherSetQty(po)
            const totalWithCargo = totalWithVat + cargoFee
            return (
              <tr key={po.id}>
                <td style={S.td}><strong style={{ color: COLORS.primary }}>{po.id}</strong></td>
                <td style={S.td}><strong>{po.school_name}</strong></td>
                <td style={S.td}>{po.season}</td>
                <td style={S.td}>
                  <strong>{fmt(totalWithCargo)}</strong>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Ara Toplam (KDV Hariç): {fmt(total)}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>Ara Toplam (KDV Dahil): {fmt(totalWithVat)}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>Kargo: {fmt(cargoFee)}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>Ücretsiz Set: {teacherSetQty}</div>
                </td>
                <td style={S.td}>
                  {sf ? (
                    <span style={S.badge(FORM_STATUS[sf.status]?.color || '#aaa')}>{FORM_STATUS[sf.status]?.label || sf.status}</span>
                  ) : (
                    <span style={S.badge('#aaa')}>Form Yok</span>
                  )}
                </td>
                <td style={S.td}><span style={S.badge(STATUS[po.status]?.color || '#aaa')}>{STATUS[po.status]?.label || po.status}</span></td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button style={{ ...S.btn(COLORS.teal), fontSize: 11, padding: '5px 10px' }} onClick={() => setDetail(po)}>Detay</button>
                    {canManageForm && (
                      <button style={{ ...S.btn(COLORS.primary), fontSize: 11, padding: '5px 10px' }} onClick={() => createFormLink(po)}>
                        {sf ? 'Linki Kopyala' : 'Form Linki Oluştur'}
                      </button>
                    )}
                    {isEditable && (
                      <>
                        <button style={{ ...S.btn('#4f46e5'), fontSize: 11, padding: '5px 10px' }} onClick={() => openEdit(po)}>Düzenle</button>
                        <button style={{ ...S.btn('#ef4444'), fontSize: 11, padding: '5px 10px' }} onClick={() => handleDelete(po)}>Sil</button>
                      </>
                    )}
                    {!isEditable && po.status === 'kesinlesti' && (
                      <span style={{ ...S.badge('#6b7280'), alignSelf: 'center' }}>Düzenleme Kilitli</span>
                    )}
                    {sf && (sf.status === 'tamamlandi' || sf.status === 'okul_formu_guncelledi') && (
                      <>
                        <button style={{ ...S.btn(COLORS.yellow), fontSize: 11, padding: '5px 10px' }} onClick={() => setFormDetail(sf)}>Formu Göster</button>
                        <button style={{ ...S.btn(COLORS.green), fontSize: 11, padding: '5px 10px' }} onClick={() => approveForm(sf, po)}>Onayla</button>
                      </>
                    )}
                    {sf && sf.status === 'onaylandi' && (
                      <>
                        <button style={{ ...S.btn(COLORS.teal), fontSize: 11, padding: '5px 10px' }} onClick={() => setFormDetail(sf)}>Formu Göster</button>
                        <button style={{ ...S.btn(COLORS.green), fontSize: 11, padding: '5px 10px' }} onClick={() => downloadApprovedForm(sf)}>Onaylı Formu İndir</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}</tbody>
          <tfoot>
            <tr style={{ background: '#f8f4ff' }}>
              <td colSpan={3} style={{ ...S.td, fontWeight: 800, textAlign: 'right', color: COLORS.primary }}>TOPLAM (KDV Hariç):</td>
              <td style={{ ...S.td, fontWeight: 800, color: COLORS.primary }}><strong>{fmt(filteredTotal)}</strong></td>
              <td colSpan={3} style={S.td}></td>
            </tr>
            <tr style={{ background: '#f8f4ff' }}>
              <td colSpan={3} style={{ ...S.td, fontWeight: 800, textAlign: 'right', color: COLORS.green }}>TOPLAM (KDV Dahil / 1/3'e %20):</td>
              <td style={{ ...S.td, fontWeight: 800, color: COLORS.green }}><strong>{fmt(filteredTotalWithVat)}</strong></td>
              <td colSpan={3} style={S.td}></td>
            </tr>
            <tr style={{ background: '#f8f4ff' }}>
              <td colSpan={3} style={{ ...S.td, fontWeight: 800, textAlign: 'right', color: COLORS.teal }}>TOPLAM KARGO (manuel):</td>
              <td style={{ ...S.td, fontWeight: 800, color: COLORS.teal }}><strong>{fmt(filteredCargoTotal)}</strong></td>
              <td colSpan={3} style={S.td}></td>
            </tr>
            <tr style={{ background: '#f8f4ff' }}>
              <td colSpan={3} style={{ ...S.td, fontWeight: 800, textAlign: 'right', color: COLORS.primary }}>TOPLAM (Kargo Dahil):</td>
              <td style={{ ...S.td, fontWeight: 800, color: COLORS.primary }}><strong>{fmt(filteredGrandTotal)}</strong></td>
              <td colSpan={3} style={S.td}></td>
            </tr>
            <tr style={{ background: '#f8f4ff' }}>
              <td colSpan={3} style={{ ...S.td, fontWeight: 800, textAlign: 'right', color: COLORS.orange }}>TOPLAM ÜCRETSİZ ÖĞRETMEN SETİ:</td>
              <td style={{ ...S.td, fontWeight: 800, color: COLORS.orange }}><strong>{filteredTeacherSetTotal}</strong></td>
              <td colSpan={3} style={S.td}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.primary, marginBottom: 10 }}>Ortak Form E-Tablosu</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1380 }}>
          <thead><tr>
            <th style={S.th}>Form</th><th style={S.th}>Ön Sipariş</th><th style={S.th}>Okul</th><th style={S.th}>Sezon</th><th style={S.th}>Durum</th>
            <th style={S.th}>Sınıf</th><th style={S.th}>Şube</th><th style={S.th}>Öğretmen</th><th style={S.th}>Mail</th><th style={S.th}>Tel</th><th style={S.th}>Adet</th>
            <th style={S.th}>Seviye Bazlı Ürünler</th><th style={S.th}>Sipariş Ürünleri</th>
          </tr></thead>
          <tbody>{sharedFormRows.length === 0 ? (
            <tr><td colSpan={13} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 24 }}>Form kaydı bulunamadı</td></tr>
          ) : sharedFormRows.map((row, idx) => (
            <tr key={`shared-form-row-${row.form_id}-${idx}`}>
              <td style={S.td}>{row.form_id}</td>
              <td style={S.td}>{row.pre_order_id}</td>
              <td style={S.td}><strong>{row.school_name}</strong></td>
              <td style={S.td}>{row.season}</td>
              <td style={S.td}>{row.status}</td>
              <td style={S.td}>{row.grade}</td>
              <td style={S.td}>{row.branch}</td>
              <td style={S.td}>{row.teacher}</td>
              <td style={S.td}>{row.teacher_email}</td>
              <td style={S.td}>{row.teacher_phone}</td>
              <td style={S.td}><strong>{row.qty}</strong></td>
              <td style={S.td}>{row.activities_text}</td>
              <td style={S.td}>{row.products_text}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editModal && (
        <div style={S.modal} onClick={() => { if (!editSaving) { setEditModal(false); setEditingPreOrder(null) } }}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 760, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <h3 style={{ color: COLORS.primary }}>Ön Sipariş Düzenle</h3>
              <button style={S.btn('#aaa')} disabled={editSaving} onClick={() => { setEditModal(false); setEditingPreOrder(null) }}>Kapat</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={S.label}>Kurum Adı *</label>
                <input style={S.input} value={editForm.school_name} onChange={e => setEditForm(prev => ({ ...prev, school_name: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Sezon</label>
                <select style={S.select} value={editForm.season} onChange={e => setEditForm(prev => ({ ...prev, season: e.target.value }))}>
                  <option>2025-2026</option>
                  <option>2026-2027</option>
                </select>
              </div>
              <div style={{ gridColumn: isMobile ? 'auto' : '1/-1' }}>
                <label style={S.label}>Adres</label>
                <input style={S.input} value={editForm.address} onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))} />
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, minWidth: 680 }}>
              <thead>
                <tr>
                  <th style={S.th}>Ürün</th>
                  <th style={S.th}>Adet</th>
                  <th style={S.th}>Birim Fiyat</th>
                  <th style={S.th}>Toplam</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>{editItems.map((item, idx) => (
                <tr key={`edit-item-${idx}`}>
                  <td style={S.td}>
                    <select style={S.select} value={item.product_id} onChange={e => updateEditItem(idx, 'product_id', e.target.value)}>
                      <option value="">Seçiniz...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td style={S.td}>
                    <input type="number" min="0" style={{ ...S.input, textAlign: 'center' }} value={item.qty} onChange={e => updateEditItem(idx, 'qty', e.target.value)} />
                  </td>
                  <td style={S.td}>
                    {isFlexiblePriceDealer ? (
                      <input type="number" min="0" style={{ ...S.input, textAlign: 'right' }} value={item.unit_price} onChange={e => updateEditItem(idx, 'unit_price', e.target.value)} />
                    ) : (
                      <strong>{fmt(item.unit_price)}</strong>
                    )}
                  </td>
                  <td style={S.td}><strong>{fmt((parseInt(item.qty) || 0) * parseAmount(item.unit_price))}</strong></td>
                  <td style={S.td}>
                    <button style={{ ...S.btn('#ef4444'), padding: '4px 8px', fontSize: 12 }} onClick={() => removeEditItem(idx)} disabled={editSaving}>✕</button>
                  </td>
                </tr>
              ))}</tbody>
              <tfoot>
                <tr style={{ background: '#faf6ff' }}>
                  <td colSpan={3} style={{ ...S.td, textAlign: 'right', fontWeight: 800, color: COLORS.primary }}>GENEL TOPLAM:</td>
                  <td style={{ ...S.td, fontWeight: 800, color: COLORS.primary }}>{fmt(editTotal)}</td>
                  <td style={S.td}></td>
                </tr>
              </tfoot>
            </table>
            <div style={{ marginBottom: 14 }}>
              <button style={{ ...S.btn(COLORS.teal), fontSize: 12 }} onClick={addEditItem} disabled={editSaving}>+ Ürün Ekle</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 8, gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>Ön Görülen Sınıf Dağılımı</div>
                <button style={{ ...S.btn(COLORS.teal), fontSize: 12, padding: '6px 10px' }} onClick={addEditClassForecastRow} disabled={editSaving}>+ Satır Ekle</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                <thead><tr><th style={S.th}>Sınıf</th><th style={S.th}>Adet</th><th style={{ ...S.th, width: 40 }}></th></tr></thead>
                <tbody>{editClassForecast.map((row, idx) => (
                  <tr key={`edit-forecast-${idx}`}>
                    <td style={S.td}>
                      <select style={S.select} value={row.grade} onChange={e => updateEditClassForecast(idx, 'grade', e.target.value)} disabled={editSaving}>
                        {FORECAST_GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                      </select>
                    </td>
                    <td style={S.td}><input type="number" min="0" style={{ ...S.input, textAlign: 'center' }} value={row.qty} onChange={e => updateEditClassForecast(idx, 'qty', e.target.value)} disabled={editSaving} /></td>
                    <td style={S.td}>{idx > 0 && <button style={{ ...S.btn('#ef4444'), padding: '4px 8px', fontSize: 12 }} onClick={() => removeEditClassForecastRow(idx)} disabled={editSaving}>✕</button>}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div style={{ marginTop: 8, fontSize: 12, color: editForecastQtyTotal === editOrderQtyTotal ? COLORS.green : COLORS.orange }}>
                Sipariş adedi: <strong>{editOrderQtyTotal}</strong> • Ön görülen sınıf toplamı: <strong>{editForecastQtyTotal}</strong>
              </div>
              {isEditForecastMismatch && (
                <div style={{ marginTop: 6, fontSize: 12, color: COLORS.orange, fontWeight: 700 }}>
                  Kaydetmek için sipariş adedi ile ön görülen sınıf toplamı eşit olmalıdır.
                </div>
              )}
              {hasDuplicateEditProducts && (
                <div style={{ marginTop: 6, fontSize: 12, color: COLORS.orange, fontWeight: 700 }}>
                  Aynı ürün birden fazla satırda seçilemez.
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Not</label>
              <input style={S.input} value={editForm.note} onChange={e => setEditForm(prev => ({ ...prev, note: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={S.btn('#9ca3af')} onClick={() => { setEditModal(false); setEditingPreOrder(null) }} disabled={editSaving}>Vazgeç</button>
              <button style={S.btn(COLORS.primary)} onClick={saveEditedPreOrder} disabled={editSaving || hasDuplicateEditProducts || isEditForecastMismatch}>{editSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Ön sipariş detay */}
      {detail && (
        <div style={S.modal} onClick={() => setDetail(null)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 760, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <h3 style={{ color: COLORS.primary }}>Ön Sipariş Detayı</h3>
              <button style={S.btn('#aaa')} onClick={() => setDetail(null)}>Kapat</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16, background: '#f8f4ff', borderRadius: 10, padding: 14 }}>
              <div><span style={{ fontSize: 11, color: '#888' }}>OKUL</span><div style={{ fontWeight: 700 }}>{detail.school_name}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>SEZON</span><div style={{ fontWeight: 700 }}>{detail.season}</div></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead><tr><th style={S.th}>Ürün</th><th style={S.th}>Adet</th><th style={S.th}>Birim Fiyat</th><th style={S.th}>Toplam</th></tr></thead>
              <tbody>{(detail.pre_order_items || []).map((item, idx) => (
                <tr key={idx}>
                  <td style={S.td}>{products.find(p => p.id === item.product_id)?.name || '-'}</td>
                  <td style={S.td}>{item.qty}</td>
                  <td style={S.td}>{fmt(item.unit_price)}</td>
                  <td style={S.td}><strong>{fmt((item.qty || 0) * (item.unit_price || 0))}</strong></td>
                </tr>
              ))}</tbody>
            </table>
            <div style={{ marginTop: 12, marginBottom: 16, background: '#f8f4ff', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Ara Toplam (KDV Hariç)</span>
                <strong>{fmt(getPreOrderSubtotal(detail))}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Ara Toplam (KDV Dahil)</span>
                <strong>{fmt(getAmountWithVat(getPreOrderSubtotal(detail)))}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Kargo Bedeli</span>
                <strong>{fmt(detailCargoFee)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Ücretsiz Öğretmen Seti</span>
                <strong>{detailTeacherSetQty}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: COLORS.primary }}>
                <span>Kargo Dahil Toplam (KDV Dahil)</span>
                <span>{fmt(getAmountWithVat(getPreOrderSubtotal(detail)) + detailCargoFee)}</span>
              </div>
              {detailNoteData.userNote && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#444' }}>
                  <strong>Not:</strong> {detailNoteData.userNote}
                </div>
              )}
            </div>
            {detailForecastRows.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 8 }}>Ön Görülen Sınıf Dağılımı</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                  <thead><tr><th style={S.th}>Sınıf</th><th style={S.th}>Adet</th></tr></thead>
                  <tbody>{detailForecastRows.map((row, idx) => (
                    <tr key={`detail-forecast-${idx}`}>
                      <td style={S.td}>{row.grade}</td>
                      <td style={S.td}><strong>{row.qty || 0}</strong></td>
                    </tr>
                  ))}</tbody>
                  <tfoot>
                    <tr style={{ background: '#f8f4ff' }}>
                      <td style={{ ...S.td, fontWeight: 800, textAlign: 'right' }}>TOPLAM:</td>
                      <td style={{ ...S.td, fontWeight: 800, color: COLORS.primary }}>{detailForecastRows.reduce((sum, row) => sum + (row.qty || 0), 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: '#f8f4ff' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.primary, marginBottom: 8 }}>Form Detayı</div>
              {!detailLinkedForm ? (
                <div style={{ fontSize: 12, color: '#666' }}>Bu ön sipariş için henüz form oluşturulmamış.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><span style={{ fontSize: 11, color: '#888' }}>FORM DURUMU</span><div style={{ fontWeight: 700 }}>{FORM_STATUS[detailLinkedForm.status]?.label || detailLinkedForm.status}</div></div>
                    <div><span style={{ fontSize: 11, color: '#888' }}>YETKİLİ</span><div style={{ fontWeight: 700 }}>{detailLinkedForm.contact_name || '-'}</div></div>
                    <div><span style={{ fontSize: 11, color: '#888' }}>TELEFON</span><div style={{ fontWeight: 700 }}>{detailLinkedForm.contact_phone || '-'}</div></div>
                    <div><span style={{ fontSize: 11, color: '#888' }}>MAIL</span><div style={{ fontWeight: 700 }}>{detailLinkedForm.contact_email || '-'}</div></div>
                    <div><span style={{ fontSize: 11, color: '#888' }}>VERGİ NO</span><div style={{ fontWeight: 700 }}>{detailLinkedForm.tax_no || '-'}</div></div>
                    <div><span style={{ fontSize: 11, color: '#888' }}>VERGİ DAİRESİ</span><div style={{ fontWeight: 700 }}>{detailLinkedForm.tax_office || '-'}</div></div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>SEVİYE BAZLI ÜRÜN LİSTESİ</div>
                    {Object.keys(detailFormActivitiesByLevel).length > 0 ? (
                      Object.entries(detailFormActivitiesByLevel).map(([level, activities]) => (
                        <div key={level} style={{ fontSize: 12, color: '#333', fontWeight: 700, marginBottom: 4 }}>
                          {level}: {activities.join(', ')}
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 12, color: '#666' }}>-</div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 8 }}>Sınıf Dağılımı</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                    <thead><tr><th style={S.th}>Sınıf</th><th style={S.th}>Şube</th><th style={S.th}>Öğretmen</th><th style={S.th}>Mail</th><th style={S.th}>Tel</th><th style={S.th}>Adet</th></tr></thead>
                    <tbody>{detailFormClassRows.length === 0 ? (
                      <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#999' }}>Sınıf detayı yok</td></tr>
                    ) : detailFormClassRows.map((row, idx) => (
                      <tr key={`detail-form-row-${idx}`}>
                        <td style={S.td}>{row.grade || '-'}</td>
                        <td style={S.td}>{row.branch || '-'}</td>
                        <td style={S.td}>{row.teacher || '-'}</td>
                        <td style={S.td}>{row.teacher_email || '-'}</td>
                        <td style={S.td}>{row.teacher_phone || '-'}</td>
                        <td style={S.td}><strong>{row.qty || 0}</strong></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Okul formu detay */}
      {formDetail && (
        <div style={S.modal} onClick={() => setFormDetail(null)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 700, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <h3 style={{ color: COLORS.primary }}>Okul Form Detayı</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {formDetail?.status === 'onaylandi' && <button style={S.btn(COLORS.green)} onClick={() => downloadApprovedForm(formDetail)}>Onaylı Formu İndir</button>}
                <button style={S.btn('#aaa')} onClick={() => setFormDetail(null)}>Kapat</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16, background: '#f8f4ff', borderRadius: 10, padding: 14 }}>
              <div><span style={{ fontSize: 11, color: '#888' }}>KURUM</span><div style={{ fontWeight: 700 }}>{formDetail.school_name}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>VERGİ NO</span><div style={{ fontWeight: 700 }}>{formDetail.tax_no || '-'}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>VERGİ DAİRESİ</span><div style={{ fontWeight: 700 }}>{formDetail.tax_office || '-'}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>YETKİLİ</span><div style={{ fontWeight: 700 }}>{formDetail.contact_name || '-'}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>TELEFON</span><div style={{ fontWeight: 700 }}>{formDetail.contact_phone || '-'}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>MAIL</span><div style={{ fontWeight: 700 }}>{formDetail.contact_email || '-'}</div></div>
              <div style={{ gridColumn: isMobile ? 'auto' : '1/-1' }}><span style={{ fontSize: 11, color: '#888' }}>ADRES</span><div style={{ fontWeight: 700 }}>{formDetail.address || '-'}</div></div>
            </div>
            <div style={{ marginBottom: 16, background: '#f8f4ff', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>SEVİYE BAZLI ÜRÜN LİSTESİ</div>
              {Object.keys(formActivitiesByLevel).length > 0 ? (
                Object.entries(formActivitiesByLevel).map(([level, activities]) => (
                  <div key={level} style={{ fontWeight: 700, fontSize: 13, color: '#333', marginBottom: 3 }}>
                    {level}: {activities.join(', ')}
                  </div>
                ))
              ) : (
                <div style={{ fontWeight: 700, fontSize: 13, color: '#333' }}>-</div>
              )}
            </div>
            {formLinkedPreOrder && (
              <div style={{ marginBottom: 16, background: '#f8f4ff', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 8 }}>Sipariş Ürün Detayı</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                  <thead><tr><th style={S.th}>Ürün</th><th style={S.th}>Adet</th><th style={S.th}>Birim Fiyat</th><th style={S.th}>Toplam</th></tr></thead>
                  <tbody>{(formLinkedPreOrder.pre_order_items || []).map((item, idx) => (
                    <tr key={`form-linked-item-${idx}`}>
                      <td style={S.td}>{products.find(p => p.id === item.product_id)?.name || '-'}</td>
                      <td style={S.td}>{item.qty || 0}</td>
                      <td style={S.td}>{fmt(item.unit_price || 0)}</td>
                      <td style={S.td}><strong>{fmt((item.qty || 0) * (item.unit_price || 0))}</strong></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>Sınıf Dağılımı</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead><tr>
                <th style={S.th}>Sınıf</th><th style={S.th}>Şube</th><th style={S.th}>Öğretmen</th><th style={S.th}>Mail</th><th style={S.th}>Tel</th><th style={S.th}>Adet</th>
              </tr></thead>
              <tbody>{formClassRows.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ ...S.td, fontWeight: 700, color: COLORS.primary }}>{item.grade}</td>
                  <td style={S.td}>{item.branch || '-'}</td>
                  <td style={S.td}>{item.teacher || '-'}</td>
                  <td style={S.td}>{item.teacher_email || '-'}</td>
                  <td style={S.td}>{item.teacher_phone || '-'}</td>
                  <td style={S.td}><strong>{item.qty}</strong></td>
                </tr>
              ))}</tbody>
              <tfoot>
                <tr style={{ background: '#f8f4ff' }}>
                  <td colSpan={5} style={{ ...S.td, fontWeight: 800, textAlign: 'right' }}>TOPLAM:</td>
                  <td style={{ ...S.td, fontWeight: 800, color: COLORS.primary }}>{formClassRows.reduce((s, i) => s + (i.qty || 0), 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Orders({ orders, products, isMobile }) {
  const [detail, setDetail] = useState(null)
  const [detailItems, setDetailItems] = useState([])
  const [detailClassRows, setDetailClassRows] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const getProductName = (id) => products.find(p => p.id === id)?.name || `Ürün #${id}`
  const STATUS_META = {
    beklemede: { label: 'Beklemede', color: '#f59e0b' },
    hazirlaniyor: { label: 'Hazırlanıyor', color: '#60CDCB' },
    yolda: { label: 'Yolda', color: '#8C479C' },
    teslim_edildi: { label: 'Teslim Edildi', color: '#86B535' },
    iptal: { label: 'İptal', color: '#ef4444' },
  }

  const openDetail = async (order) => {
    setDetail(order)
    setDetailLoading(true)
    const [itemsRes, classRes] = await Promise.all([
      supabase.from('order_items').select('product_id, qty, unit_price, free_qty').eq('order_id', order.id),
      supabase.from('order_class_items').select('grade, branch, teacher, qty').eq('order_id', order.id),
    ])
    setDetailItems(itemsRes.data || [])
    setDetailClassRows(classRes.data || [])
    setDetailLoading(false)
  }
  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 20 }}>Siparişlerim</h2>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
          <thead><tr>
            <th style={S.th}>Sipariş No</th><th style={S.th}>Okul</th><th style={S.th}>Sezon</th><th style={S.th}>Ara Toplam</th><th style={S.th}>Kargo</th><th style={S.th}>Ücretsiz Set</th><th style={S.th}>Kargo Dahil Toplam</th><th style={S.th}>Durum</th><th style={S.th}>Fatura</th><th style={S.th}>Dia</th><th style={S.th}></th>
          </tr></thead>
          <tbody>{orders.length === 0 ? (
            <tr><td colSpan={11} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 32 }}>Henüz sipariş yok</td></tr>
          ) : orders.map(o => (
            <tr key={o.id}>
              <td style={S.td}><strong style={{ color: COLORS.primary }}>{o.id}</strong></td>
              <td style={S.td}>{o.school_name || '-'}</td>
              <td style={S.td}>{o.season}</td>
              <td style={S.td}><strong>{fmt(o.total)}</strong></td>
              <td style={S.td}>{fmt(getOrderCargoFee(o))}</td>
              <td style={S.td}>{getOrderTeacherSetCount(o)}</td>
              <td style={S.td}><strong>{fmt(getOrderTotalWithCargo(o))}</strong></td>
              <td style={S.td}><span style={S.badge(STATUS_META[o.status]?.color || '#aaa')}>{STATUS_META[o.status]?.label || (o.status || '-')}</span></td>
              <td style={S.td}><span style={S.badge(o.invoice_status === 'kesildi' ? COLORS.green : COLORS.orange)}>{o.invoice_status}</span></td>
              <td style={S.td}><span style={S.badge(o.dia_status ? COLORS.green : '#aaa')}>{o.dia_status ? 'İşlendi' : 'İşlenmedi'}</span></td>
              <td style={S.td}><button style={{ ...S.btn(COLORS.teal), fontSize: 11, padding: '5px 10px' }} onClick={() => openDetail(o)}>Detay</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {detail && (
        <div style={S.modal} onClick={() => setDetail(null)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 760, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <h3 style={{ color: COLORS.primary }}>Sipariş Detayı</h3>
              <button style={S.btn('#aaa')} onClick={() => setDetail(null)}>Kapat</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 16, background: '#f8f4ff', borderRadius: 10, padding: 14 }}>
              <div><span style={{ fontSize: 11, color: '#888' }}>SİPARİŞ NO</span><div style={{ fontWeight: 700 }}>{detail.id}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>OKUL</span><div style={{ fontWeight: 700 }}>{detail.school_name || '-'}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>SEZON</span><div style={{ fontWeight: 700 }}>{detail.season || '-'}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>DURUM</span><div style={{ fontWeight: 700 }}>{STATUS_META[detail.status]?.label || detail.status || '-'}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>FATURA</span><div style={{ fontWeight: 700 }}>{detail.invoice_status || '-'}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>SEVK TARİHİ</span><div style={{ fontWeight: 700 }}>{detail.cargo_date ? new Date(detail.cargo_date).toLocaleDateString('tr-TR') : '-'}</div></div>
            </div>
            {detailLoading ? (
              <div style={{ fontSize: 13, color: '#888' }}>Yükleniyor...</div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>Sipariş Kalemleri</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, minWidth: 700 }}>
                  <thead><tr><th style={S.th}>Ürün</th><th style={S.th}>Adet</th><th style={S.th}>Birim Fiyat</th><th style={S.th}>Ücretsiz</th><th style={S.th}>Toplam</th></tr></thead>
                  <tbody>{detailItems.length === 0 ? (
                    <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#aaa' }}>Kalem bulunamadı</td></tr>
                  ) : detailItems.map((item, idx) => (
                    <tr key={`${item.product_id}-${idx}`}>
                      <td style={S.td}>{getProductName(item.product_id)}</td>
                      <td style={S.td}>{item.qty || 0}</td>
                      <td style={S.td}>{fmt(item.unit_price || 0)}</td>
                      <td style={S.td}>{item.free_qty || 0}</td>
                      <td style={S.td}><strong>{fmt((item.qty || 0) * (item.unit_price || 0))}</strong></td>
                    </tr>
                  ))}</tbody>
                </table>
                <div style={{ marginBottom: 14, background: '#f8f4ff', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>Ara Toplam</span>
                    <strong>{fmt(detail.total || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>Kargo Bedeli</span>
                    <strong>{fmt(getOrderCargoFee(detail))}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>Ücretsiz Öğretmen Seti</span>
                    <strong>{getOrderTeacherSetCount(detail)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: COLORS.primary }}>
                    <span>Kargo Dahil Toplam</span>
                    <span>{fmt(getOrderTotalWithCargo(detail))}</span>
                  </div>
                </div>
                {detailClassRows.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>Sınıf Dağılımı</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                      <thead><tr><th style={S.th}>Sınıf</th><th style={S.th}>Şube</th><th style={S.th}>Öğretmen</th><th style={S.th}>Adet</th></tr></thead>
                      <tbody>{detailClassRows.map((row, idx) => (
                        <tr key={`${row.grade}-${idx}`}>
                          <td style={S.td}>{row.grade || '-'}</td>
                          <td style={S.td}>{row.branch || '-'}</td>
                          <td style={S.td}>{row.teacher || '-'}</td>
                          <td style={S.td}><strong>{row.qty || 0}</strong></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentsView({ payments, checks, isMobile }) {
  const CHECK_STATUS = { musteride: { label: 'Müşteride', color: '#f59e0b' }, portfolyde: { label: 'Portföyde', color: '#60CDCB' }, tedarikcide: { label: 'Tedarikçide', color: '#8C479C' }, tahsil_edildi: { label: 'Tahsil Edildi', color: '#86B535' } }
  const cashPayments = payments.filter(p => p.method !== 'cek')

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: isMobile ? 16 : 20 }}>Ödemelerim</h2>
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>Nakit / Havale</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
          <thead><tr><th style={S.th}>Tarih</th><th style={S.th}>Yöntem</th><th style={S.th}>Tutar</th><th style={S.th}>Not</th></tr></thead>
          <tbody>{cashPayments.length === 0 ? <tr><td colSpan={4} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 24 }}>Kayıt yok</td></tr> : cashPayments.map(p => (
            <tr key={p.id}><td style={S.td}>{new Date(p.date).toLocaleDateString('tr-TR')}</td><td style={S.td}><span style={S.badge(COLORS.teal)}>{p.method}</span></td><td style={S.td}><strong style={{ color: COLORS.green }}>{fmt(p.amount)}</strong></td><td style={S.td}>{p.note || '-'}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>Çekler</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
          <thead><tr><th style={S.th}>Vade</th><th style={S.th}>Tutar</th><th style={S.th}>Banka</th><th style={S.th}>Durum</th></tr></thead>
          <tbody>{checks.length === 0 ? <tr><td colSpan={4} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 24 }}>Kayıt yok</td></tr> : checks.map(c => (
            <tr key={c.id}><td style={S.td}>{new Date(c.due_date).toLocaleDateString('tr-TR')}</td><td style={S.td}><strong style={{ color: COLORS.green }}>{fmt(c.amount)}</strong></td><td style={S.td}>{c.bank || '-'}</td><td style={S.td}><span style={S.badge(CHECK_STATUS[c.status]?.color || '#aaa')}>{CHECK_STATUS[c.status]?.label || c.status}</span></td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function ChecksView({ checks, isMobile }) {
  const CHECK_STATUS = { musteride: { label: 'Müşteride', color: '#f59e0b' }, portfolyde: { label: 'Portföyde', color: '#60CDCB' }, tedarikcide: { label: 'Tedarikçide', color: '#8C479C' }, tahsil_edildi: { label: 'Tahsil Edildi', color: '#86B535' } }

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: isMobile ? 16 : 20 }}>Çeklerim</h2>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead><tr><th style={S.th}>Vade</th><th style={S.th}>Tutar</th><th style={S.th}>Banka</th><th style={S.th}>Durum</th><th style={S.th}>Not</th></tr></thead>
          <tbody>{checks.length === 0 ? <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 32 }}>Çek kaydı yok</td></tr> : checks.map(c => (
            <tr key={c.id}><td style={S.td}><strong>{new Date(c.due_date).toLocaleDateString('tr-TR')}</strong></td><td style={S.td}><strong style={{ color: COLORS.green }}>{fmt(c.amount)}</strong></td><td style={S.td}>{c.bank || '-'}</td><td style={S.td}><span style={S.badge(CHECK_STATUS[c.status]?.color || '#aaa')}>{CHECK_STATUS[c.status]?.label || c.status}</span></td><td style={S.td}>{c.note || '-'}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}