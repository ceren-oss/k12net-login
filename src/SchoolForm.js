import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import kesifKutusuLogo from './assets/kesif-kutusu-logo.png'
import loginBg from './assets/login-bg.png'
import { downloadSchoolFormReport } from './formExportUtils'
import useIsMobile from './useIsMobile'

const COLORS = {
  primary: '#8C479C', yellow: '#FCC400', teal: '#60CDCB',
  green: '#86B535', orange: '#EC6A34', bg: '#f8f4ff',
}

const GRADES = ['4 Yaş', '5-6 Yaş', '1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf', '5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf']
const PRODUCT_MARKER_GRADE = '__URUN__'
const ACTIVITY_MARKER_GRADE = '__ETKINLIK__'
const STEM_BRANCH_PREFIX = '__STEM__'
// Kaynak: ARGE - Keşif Kutusu.pdf + ARGE - 8. Sınıf.pdf (ARGE onaylı, broşür sırası)
// Her seviye 1.Dönem / 2.Dönem olarak İKİ AYRI BLOK halinde tutulur.
// Toplam 152 etkinlik. 8. Sınıf istisna: sadece 8 etkinlik (4+4).
const TERMS = ['1.Dönem', '2.Dönem']
const ACTIVITY_OPTIONS_BY_GRADE = {
  '4 Yaş': {
    '1.Dönem': [
      'Köpüren Dinozor',
      'Dinozorlar Nerede?',
      'Benim Vücudum',
      'Galaksi Kavanozum',
      'Duygularımı Keşfediyorum',
      'Sevimli Balık',
      'Yağmuru Gözlemle!',
      'Islanmayan Resim',
    ],
    '2.Dönem': [
      'Renklerin Gizemi',
      'Bilim Kokusu',
      'İz Peşinde',
      'Çılgın Bilim',
      'Büyüteçle Keşif Zamanı',
      'Keşif Dürbünü',
      'Bitki Hazinem',
      'Kuş Yemliği',
    ],
  },
  '5-6 Yaş': {
    '1.Dönem': [
      'İlk Sabunum',
      'Benim Galaksim',
      'Yapay Kar',
      'Gölge Oyunu / Şekiller',
      'Üflemeden Balon Şişer Mi?',
      'Kayan Balık',
      'Renklerin Ahengi',
      'Sınıfımda Müze',
    ],
    '2.Dönem': [
      'Canavar Poşet',
      'Su Döngüsü',
      'Orman Katmanları Modeli',
      'Yanardağ Patlıyor!',
      'Canlıların Yaşam Döngüsü',
      'Rüzgar Gülü Yapıyorum',
      'Sesle Zıplayan Toplar',
      'Bitkimi Yetiştiriyorum',
    ],
  },
  '1. Sınıf': {
    '1.Dönem': [
      'Bilimle Boyama',
      'Ses Topu',
      'Ay Taşı Yapalım!',
      'Doğanın Kokusu',
      'Keşif Aracı',
      'Güvenli Şehrim',
      'Dans Eden Kemikler',
      'Benim Sağlıklı Tabağım',
    ],
    '2.Dönem': [
      'Nasıl Nefes Alıyoruz?',
      'Lav Lambası',
      'Ülkemin Güzellikleri',
      'Işıklı Uçağım',
      'Tohum Günlüğü',
      'Büyüteç Yapımı',
      'Mis Kokulu Kremim',
      'Rüzgar Dedektifleri',
    ],
  },
  '2. Sınıf': {
    '1.Dönem': [
      'Renkli Köpükler',
      'Minik Dostuma Hediye',
      'İlk Diş Macunum',
      'Vitamin Avcıları',
      'Siren Üretimi',
      'Katı mı? Sıvı mı?',
      'Rüzgar Türbinim',
      'Parmak İzim',
    ],
    '2.Dönem': [
      'STEM Deprem Etkinliği',
      'Tarihi Şekillendir',
      'İklim Kahramanları',
      'Hortum Oluşumu',
      'Ekolojik Denge',
      'Işıldayan Kart',
      'Model Uçak',
      'Mikro Filiz',
    ],
  },
  '3. Sınıf': {
    '1.Dönem': [
      'Dünya\'nın Katmanları',
      '3-2-1 Fırla!',
      'Kurbağanın Yaşam Döngüsü',
      'Parfüm Üretimi',
      'Madenciler İş Başında!',
      'Gizemli Hâller',
      'Karışımların Ayrılması',
      'Medeniyet Hamuru',
    ],
    '2.Dönem': [
      'Hava ile Giden Araba',
      'Mancınıkla Fırlat',
      'Elektriğin Gücü',
      'Kar Küresi',
      'Belirteç Deneyi',
      'Tohum Topu',
      'Çiftlik Evim',
      'Yaşam Kürem',
    ],
  },
  '4. Sınıf': {
    '1.Dönem': [
      'Paleontologlar İş Başında',
      'Gece Gündüz Oluşumu',
      'Tabağımı Keşfediyorum',
      'Şekerimin Dozu',
      'Suda Giden Gemi',
      'Mıknatısın Gücü',
      'Yoğunluk Kulesi',
      'Terazi Yapıyorum',
    ],
    '2.Dönem': [
      'Karışımların Ayrılması',
      'Girişimcilik',
      'Kaleydoskop',
      'Sesten Harekete',
      'Karbon Ayak İzimiz',
      'Damla Sulama Yapalım!',
      'Ledli Bileklik',
      'İletkenlik Test Kiti',
    ],
  },
  '5. Sınıf': {
    '1.Dönem': [
      'Ayın Evreleri',
      'Güneş, Dünya ve Ay\'ın Yolculuğu',
      'Dinamometre Yapımı',
      'Sürtünme Kuvvetinin Etkisi',
      'Bitki Hücresi',
      'İskeletim Nerede?',
      'Işığın Yolu',
      'Işık Geçirgenlik Test Kiti',
    ],
    '2.Dönem': [
      'Gölgelerin Gücü Adına',
      'Güneş Saati',
      'Maddenin Doğası',
      'Termometre Yapımı',
      'Aydınlık Bir Gece',
      'Ampulüm Parlak',
      'Atıktan Filize',
      'Sürdürülebilir Enerji!',
    ],
  },
  '6. Sınıf': {
    '1.Dönem': [
      'Güneş Sistemi Projektörü',
      'Tutulmalar',
      'Bileşke Kuvvet',
      'Yolculuk',
      'Hücreler İş Başında!',
      'Güneş, Su, Mineral',
      'Beyin Devreleri',
      'Periskop',
    ],
    '2.Dönem': [
      'Renk Çarkı',
      'Mum Yapımı',
      'Yoğunluk Tayini',
      'İletkenlik Avcıları',
      'Direnç Keşfi',
      'Teraryum Yapıyorum',
      'Temiz Suya Nasıl Ulaşırım?',
      'Krem Üretimi',
    ],
  },
  '7. Sınıf': {
    '1.Dönem': [
      'Teleskop Yapımı',
      'Uydu Modeli',
      'Kuvvetle İş Başında',
      'Enerji Kulesi',
      'Hidrolik Fren',
      'Büyük ve Küçük Kan Dolaşımı',
      'Solunum Sistemi Modeli',
      'Böbrekler Nasıl Süzüyor?',
    ],
    '2.Dönem': [
      'Yanıltan Ok',
      'Işığın Kırılması',
      'Maddenin Yapısı',
      'Karışımlar',
      'Karışımları Ayıralım',
      'Elektroskop',
      'Kireç Suyu Neden Bulanır?',
      'Hayal Et, Tasarla, Üret',
    ],
  },
  '8. Sınıf': {
    '1.Dönem': [
      'Güneş-Dünya-Ay',
      'Ben Kimim?',
      'Hidrolik Otopark',
      'pH Kaç?',
    ],
    '2.Dönem': [
      'Polimer Sünger Yapımı',
      'Su Kuyusu Yapımı',
      'Güneş Enerjili Araç',
      'Elektroskop',
    ],
  },
}
const STEM_PLAN_OPTIONS = {
  plan1: {
    label: 'PLAN 1 STEM',
    shipments: [
      {
        key: 'sevkiyat1',
        label: '1. Sevkiyat',
        options: [
          'Sırt Kaşıyıcı Yapalım',
          '3 Boyutlu Teknolojiler',
          'Yapı İnşa - Deprem',
          'Biyomimikri (Kuş Gagası Yapalım)',
        ],
      },
      {
        key: 'sevkiyat2',
        label: '2. Sevkiyat',
        options: [
          'Anemometre Yapalım',
          'Hoverboard Yapalım',
          'Mimarlar ve Mühendisler Birlikte Çalışıyor',
        ],
      },
      {
        key: 'sevkiyat3',
        label: '3. Sevkiyat',
        options: [
          'Kendi Elektrik Devrem-1',
          'Hareket Eden Araba Tasarlayalım',
          'Çevre Kaynaklarını Bilinçli Kullanalım',
        ],
      },
      {
        key: 'sevkiyat4',
        label: '4. Sevkiyat',
        options: [
          'Periskop Yapalım',
          'Kum Saati Yapımı',
          'Su Yüzeyinde Hareket Edebilen Bir Araç Yapalım',
        ],
      },
    ],
  },
  plan2: {
    label: 'PLAN 2 STEM',
    shipments: [
      {
        key: 'sevkiyat1',
        label: '1. Sevkiyat',
        options: [
          'Robotik Kol Tasarlayalım',
          'Hidrolik Asansör',
          'Mimarlar ve Mühendisler Birlikte Çalışıyor',
        ],
      },
      {
        key: 'sevkiyat2',
        label: '2. Sevkiyat',
        options: [
          'Kamuflaj',
          'Kuvvetin Etkisi ile Tasarım',
          'Rollercoaster',
        ],
      },
      {
        key: 'sevkiyat3',
        label: '3. Sevkiyat',
        options: [
          'Kendi Elektrik Devrem-2',
          'Hedefleri Vuralım',
          'Mühendislik Tasarım Döngüsünü Kullanarak Düzenleyici Oluşturma',
          'Köprü İnşaa',
        ],
      },
      {
        key: 'sevkiyat4',
        label: '4. Sevkiyat',
        options: [
          'Güvenli İniş',
          'Robotik Böcek Tasarlayalım',
          'Basit Makineler',
          'Su Kuyusu Yapalım',
        ],
      },
    ],
  },
  plan3: {
    label: 'PLAN 3 STEM',
    shipments: [
      {
        key: 'sevkiyat1',
        label: '1. Sevkiyat',
        options: [
          'Rüzgarın Gücüyle Giden Araç',
          'Temel Sismograf Modeli',
          'Tutulma Modeli',
        ],
      },
      {
        key: 'sevkiyat2',
        label: '2. Sevkiyat',
        options: [
          'Süper Fan',
          'Sulama Sistemi Yapalım',
          'Gece Lambası Yapalım',
        ],
      },
      {
        key: 'sevkiyat3',
        label: '3. Sevkiyat',
        options: [
          'Hidrolik Otopark',
          'Işık Mikroskobu Yapalım',
          'Newton Sarkacı',
          'Robot Yapıyorum',
        ],
      },
      {
        key: 'sevkiyat4',
        label: '4. Sevkiyat',
        options: [
          'Su Çarkı Yapıyorum',
          'Rüzgâr Türbinli Kasaba',
          'Eşit Kollu Terazi',
          'Şehre Temiz Su Sağlayalım',
        ],
      },
    ],
  },
}
const parseStemPlanKeyFromProductName = (productName) => {
  const normalized = String(productName || '').toLocaleLowerCase('tr-TR')
  if (!normalized.includes('stem')) return null
  if (/\bplan\s*1\b/.test(normalized) || /\b1\s*plan\b/.test(normalized)) return 'plan1'
  if (/\bplan\s*2\b/.test(normalized) || /\b2\s*plan\b/.test(normalized)) return 'plan2'
  if (/\bplan\s*3\b/.test(normalized) || /\b3\s*plan\b/.test(normalized)) return 'plan3'
  return null
}
const getStemPlanConfigs = (orderItems, productsById) => {
  const planKeys = []
  for (const item of orderItems || []) {
    const productName = productsById[item.product_id] || ''
    const planKey = parseStemPlanKeyFromProductName(productName)
    if (planKey && !planKeys.includes(planKey)) planKeys.push(planKey)
  }
  return planKeys
    .map(planKey => ({ planKey, ...STEM_PLAN_OPTIONS[planKey] }))
    .filter(plan => plan && Array.isArray(plan.shipments))
}
const buildStemBranchKey = (planKey, shipmentKey) => `${STEM_BRANCH_PREFIX}:${planKey}:${shipmentKey}`
const parseStemBranchKey = (branchValue) => {
  const match = String(branchValue || '').match(/^__STEM__:(plan[1-3]):(sevkiyat[1-4])$/)
  if (!match) return null
  return { planKey: match[1], shipmentKey: match[2] }
}
// Bir seviyenin dönem bloklarını verir: [{ term, activities }]
const getActivityBlocksForLevel = (level) => {
  const grade = ACTIVITY_OPTIONS_BY_GRADE[level]
  if (!grade) return []
  return TERMS
    .map(term => ({ term, activities: grade[term] || [] }))
    .filter(block => block.activities.length > 0)
}
// Dönem ayrımı olmadan, sıralı tüm etkinlikler
const getActivityOptionsForLevel = (level) => getActivityBlocksForLevel(level)
  .flatMap(block => block.activities)
// Bir seviyede toplam kaç etkinlik var (8. Sınıf = 8, diğerleri = 16)
const getMaxActivitiesForLevel = (level) => getActivityOptionsForLevel(level).length
// Paket boyutları: 6'lı, 9'lu, 10'lu da satılıyor
const PACKAGE_SELECTION_COUNTS = [4, 6, 8, 9, 10, 12, 16]
const parsePackageSizeFromName = (name) => {
  const match = (name || '').match(/(\d+)\s*['’]?\s*l(?:ı|i|u|ü)/i)
  if (!match) return null
  const count = parseInt(match[1], 10)
  return Number.isFinite(count) ? count : null
}
const getPackageSelectionConfigs = (orderItems, productsById) => {
  const found = {}
  for (const item of orderItems || []) {
    const productName = productsById[item.product_id] || ''
    const count = parsePackageSizeFromName(productName)
    const orderQty = parseInt(item.qty, 10) || 0
    if (PACKAGE_SELECTION_COUNTS.includes(count) && orderQty > 0) {
      if (!found[count]) found[count] = { count }
    }
  }
  return Object.values(found).sort((a, b) => a.count - b.count)
}
// ÖNEMLİ: paket tipi SEVİYE BAZINDA belirlenir.
// Ön sipariş satırlarında grade alanı var; her seviye kendi ürününe göre değerlendirilir.
// (Eskiden global kontrol vardı: siparişte tek bir 16'lı satır olsa TÜM seviyeler
//  16'lı sayılıyordu. Sipariş formunda 4 yaş 16'lı, 5-6 yaş 8'li olabiliyor.)
const getPackageCountByLevel = (orderItems, productsById) => {
  const byLevel = {}
  for (const item of orderItems || []) {
    const level = String(item.grade || '').trim()
    // Ön sipariş satırlarında grade '-' olarak kaydedilebiliyor; bunu seviye saymayız
    if (!level || level === '-') continue
    const orderQty = parseInt(item.qty, 10) || 0
    if (orderQty <= 0) continue
    const count = parsePackageSizeFromName(productsById[item.product_id] || '')
    if (!PACKAGE_SELECTION_COUNTS.includes(count)) continue
    // Aynı seviyede birden fazla ürün varsa en büyüğünü esas al
    if (!byLevel[level] || count > byLevel[level]) byLevel[level] = count
  }
  return byLevel
}
const getPackageInfoText = (packageConfigs = []) => {
  if (!packageConfigs.length) return ''
  const packageSummary = packageConfigs
    .map(config => `${config.count}'li`)
    .join(' + ')
  if (packageConfigs.length === 1) {
    return `${packageSummary} paket seçimi için her sınıf seviyesinde ${packageConfigs[0].count} ürün seçiniz.`
  }
  return `Bu siparişte ${packageSummary} paketleri birlikte bulunuyor. Her sınıf seviyesi için paket tipini ayrı seçip, o pakete göre ürün sayısını tamamlayınız.`
}
const getPackageTitleText = (packageConfigs = []) => {
  if (!packageConfigs.length) return ''
  const label = packageConfigs
    .map(config => `${config.count}'li`)
    .join(' + ')
  return `${label} Keşif Kutusu`
}
const getOrderItemsTotalQty = (orderItems = []) => orderItems
  .reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0)
const getClassItemsTotalQty = (classItems = []) => classItems
  .reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0)
const getQtyMismatchMessage = (orderQtyTotal, classQtyTotal) => `Sınıf toplam adedi (${classQtyTotal}) sipariş adedinden (${orderQtyTotal}) az olamaz.`

const getOrderQtyMismatchMessage = (orderItems = [], classItems = []) => {
  const orderQtyTotal = getOrderItemsTotalQty(orderItems)
  const classQtyTotal = getClassItemsTotalQty(classItems)
  if (classQtyTotal < orderQtyTotal) return getQtyMismatchMessage(orderQtyTotal, classQtyTotal)
  return ''
}
const PREORDER_FORECAST_MARKER = '[[CLASS_FORECAST]]'
const sanitizeForecastRows = (rows = []) => (rows || [])
  .map(row => ({
    grade: row?.grade || GRADES[0],
    qty: parseInt(row?.qty, 10) || 0,
  }))
  .filter(row => row.grade && row.qty > 0)
const getForecastRowsFromPreOrderNote = (rawNote) => {
  const note = String(rawNote || '')
  const markerIndex = note.indexOf(PREORDER_FORECAST_MARKER)
  if (markerIndex < 0) return []
  const forecastRaw = note.slice(markerIndex + PREORDER_FORECAST_MARKER.length).trim()
  try {
    return sanitizeForecastRows(JSON.parse(forecastRaw))
  } catch {
    return []
  }
}
const buildClassRowsFromForecast = (forecastRows = []) => sanitizeForecastRows(forecastRows).map(row => ({
  grade: row.grade,
  branch: '',
  teacher: '',
  teacher_email: '',
  teacher_phone: '',
  qty: String(row.qty),
}))

const S = {
  input: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '2px solid #f0e8ff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '2px solid #f0e8ff', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' },
  label: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 },
  btn: (color) => ({ padding: '10px 20px', borderRadius: 9, background: color || COLORS.primary, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }),
  card: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 16px rgba(140,71,156,0.1)', marginBottom: 20 },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', padding: '10px 12px', borderBottom: '2px solid #f0e8ff' },
  td: { padding: '10px 12px', fontSize: 13, color: '#333', borderBottom: '1px solid #f9f0ff' },
}

export default function SchoolForm({ token }) {
  const [form, setForm] = useState(null)
  const [preOrder, setPreOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  // Okul bilgileri
  const [schoolName, setSchoolName] = useState('')
  const [cariAdi, setCariAdi] = useState('')
  const [formError, setFormError] = useState('')
  const [taxNo, setTaxNo] = useState('')
  const [taxOffice, setTaxOffice] = useState('')
  const [address, setAddress] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  // Sınıf dağılımı
  const [classItems, setClassItems] = useState([{ grade: '1. Sınıf', branch: '', teacher: '', teacher_email: '', teacher_phone: '', qty: '' }])
  const [isAutoFilledMode, setIsAutoFilledMode] = useState(false)
  const [selectedActivitiesByLevel, setSelectedActivitiesByLevel] = useState({})
  const [selectedPackageByLevel, setSelectedPackageByLevel] = useState({})
  const [selectedStemByPlan, setSelectedStemByPlan] = useState({})
  const [productsById, setProductsById] = useState({})
  const isMobile = useIsMobile(960)

  useEffect(() => {
    loadForm()
  }, [token])

  const loadForm = async () => {
    const { data: formData } = await supabase.from('school_forms').select('*').eq('token', token).single()
    if (!formData) { setLoading(false); return }
    setForm(formData)
    setClassItems([{ grade: '1. Sınıf', branch: '', teacher: '', teacher_email: '', teacher_phone: '', qty: '' }])

    // Daha once doldurulmusse yukle
    if (formData.school_name) {
      setSchoolName(formData.school_name)
      setCariAdi(formData.cari_adi || '')
      setTaxNo(formData.tax_no || '')
      setTaxOffice(formData.tax_office || '')
      setAddress(formData.address || '')
      setContactName(formData.contact_name || '')
      setContactPhone(formData.contact_phone || '')
      setContactEmail(formData.contact_email || '')
    }

    const [{ data: items }, { data: po }, { data: productRows }] = await Promise.all([
      supabase.from('school_form_items').select('*').eq('form_id', formData.id),
      supabase.from('pre_orders').select('*, pre_order_items(*)').eq('id', formData.pre_order_id).single(),
      supabase.from('products').select('id, name'),
    ])
    // Cari adı formda boşsa ön siparişten devral
    if (po?.cari_adi) {
      setCariAdi(prev => prev || po.cari_adi)
    }
    const productMap = {}
    if (productRows) {
      productRows.forEach(product => { productMap[product.id] = product.name })
      setProductsById(productMap)
    }
    setSelectedActivitiesByLevel({})
    setSelectedPackageByLevel({})
    setSelectedStemByPlan({})
    setIsAutoFilledMode(false)

    if (items && items.length > 0) {
      const classRows = []
      const selectedByLevel = {}
      const selectedPackageBySavedLevel = {}
      const selectedStem = {}
      items.forEach(i => {
        if (i.grade === ACTIVITY_MARKER_GRADE) {
          const level = i.branch
          const activityName = (i.teacher || '').trim()
          const activityCount = Math.max(parseInt(i.qty, 10) || 0, 1)
          const stemMeta = parseStemBranchKey(level)
          if (stemMeta && activityName) {
            if (!selectedStem[stemMeta.planKey]) selectedStem[stemMeta.planKey] = {}
            selectedStem[stemMeta.planKey][stemMeta.shipmentKey] = activityName
            return
          }
          if (level && activityName) {
            if (!selectedByLevel[level]) selectedByLevel[level] = []
            for (let idx = 0; idx < activityCount; idx += 1) {
              selectedByLevel[level].push(activityName)
            }
          }
          return
        }
        if (i.grade === PRODUCT_MARKER_GRADE) {
          const level = String(i.branch || '').trim()
          const savedPackageCount = parseInt(i.qty, 10) || parsePackageSizeFromName(i.teacher || '')
          if (level && PACKAGE_SELECTION_COUNTS.includes(savedPackageCount)) {
            selectedPackageBySavedLevel[level] = savedPackageCount
          }
          return
        }
        classRows.push({
          grade: i.grade,
          branch: i.branch,
          teacher: i.teacher,
          teacher_email: i.teacher_email,
          teacher_phone: i.teacher_phone,
          qty: i.qty,
        })
      })
      if (classRows.length > 0) setClassItems(classRows)
      if (Object.keys(selectedByLevel).length > 0) {
        const normalized = Object.fromEntries(
          Object.entries(selectedByLevel).map(([level, activities]) => {
            const availableOptions = getActivityOptionsForLevel(level)
            return [
              level,
              availableOptions.length > 0
                ? activities.filter(activity => availableOptions.includes(activity))
                : activities
            ]
          })
        )
        setSelectedActivitiesByLevel(normalized)
      }
      if (Object.keys(selectedStem).length > 0) {
        setSelectedStemByPlan(selectedStem)
      }
      if (Object.keys(selectedPackageBySavedLevel).length > 0) {
        setSelectedPackageByLevel(selectedPackageBySavedLevel)
      }
    } else if (po) {
      // 1) Ön sipariş satırlarında gerçek seviye varsa oradan kur (asıl kaynak).
      //    Excel'de "SINIF | ÜRÜN | ADET" olarak girildiği için seviye ↔ paket bağı burada.
      const levelQtyFromItems = new Map()
      for (const item of (po.pre_order_items || [])) {
        const level = String(item.grade || '').trim()
        const itemQty = parseInt(item.qty, 10) || 0
        if (!level || level === '-' || itemQty <= 0) continue
        levelQtyFromItems.set(level, (levelQtyFromItems.get(level) || 0) + itemQty)
      }
      const classRowsFromItems = GRADES
        .filter(grade => levelQtyFromItems.has(grade))
        .map(grade => ({
          grade,
          branch: '',
          teacher: '',
          teacher_email: '',
          teacher_phone: '',
          qty: String(levelQtyFromItems.get(grade)),
        }))
      if (classRowsFromItems.length > 0) {
        setClassItems(classRowsFromItems)
        setIsAutoFilledMode(true)
      } else {
        // 2) Yoksa eski yola dön: nottaki sınıf dağılımı
        const forecastRows = getForecastRowsFromPreOrderNote(po.note)
        const classRowsFromForecast = buildClassRowsFromForecast(forecastRows)
        if (classRowsFromForecast.length > 0) {
          setClassItems(classRowsFromForecast)
          setIsAutoFilledMode(true)
        }
      }
    }

    if (po) setPreOrder(po)

    if (formData.status === 'tamamlandi' || formData.status === 'okul_formu_guncelledi' || formData.status === 'form_kaydedildi' || formData.status === 'kesinlesti' || formData.status === 'onaylandi') setSubmitted(true)
    setLoading(false)
  }
  const totalQty = getClassItemsTotalQty(classItems)
  const orderItems = preOrder?.pre_order_items || []
  const orderQtyTotal = getOrderItemsTotalQty(orderItems)
  const qtyMismatchMessage = getOrderQtyMismatchMessage(orderItems, classItems)
  const packageSelectionConfigs = getPackageSelectionConfigs(orderItems, productsById)
  const packageCounts = packageSelectionConfigs.map(config => config.count)
  // Tüm paket boyutları seçilebilir (6'lı, 9'lu, 10'lu dahil)
  const selectablePackageConfigs = packageSelectionConfigs
  const selectablePackageCounts = selectablePackageConfigs.map(config => config.count)
  const stemPlanConfigs = getStemPlanConfigs(orderItems, productsById)
  // Seviye bazlı paket haritası (ön sipariş satırlarındaki grade alanından)
  const packageCountByLevel = getPackageCountByLevel(orderItems, productsById)
  const hasMultiplePackageOptions = selectablePackageCounts.length > 1
  const shouldShowStemSelection = stemPlanConfigs.length > 0
  const isApproved = form?.status === 'onaylandi'
  const approvalDateText = preOrder?.onaylanma_tarihi ? new Date(preOrder.onaylanma_tarihi).toLocaleString('tr-TR') : ''
  const activeLevels = [...new Set(classItems.filter(i => i.grade && parseInt(i.qty) > 0).map(i => i.grade))]
  // Bir seviyenin geçerli paket adedi.
  // ÜST SINIR KURALI: seçilebilecek etkinlik sayısı, o seviyede VAR OLAN
  // etkinlik sayısını asla geçemez. 8. Sınıf'ta 8 etkinlik olduğu için
  // 8. Sınıf'a hiçbir koşulda 8'den fazla ürün seçilemez.
  const clampToLevelCapacity = (level, count) => {
    const maxForLevel = getMaxActivitiesForLevel(level)
    if (!count) return null
    if (!maxForLevel) return count
    return Math.min(count, maxForLevel)
  }
  const getLevelPackageCount = (level) => {
    // 1) Ön siparişte bu seviye için paket belirtilmişse onu kullan (asıl kaynak)
    const fromOrder = packageCountByLevel[level]
    if (fromOrder) return clampToLevelCapacity(level, fromOrder)
    // 2) Siparişte tek paket tipi varsa onu tüm seviyelere uygula
    if (selectablePackageCounts.length === 1) return clampToLevelCapacity(level, selectablePackageCounts[0])
    // 3) Aksi halde kullanıcının o seviye için elle seçimini kullan
    const selectedCount = parseInt(selectedPackageByLevel[level], 10)
    return selectablePackageCounts.includes(selectedCount)
      ? clampToLevelCapacity(level, selectedCount)
      : null
  }
  // Paket adedi, o seviyedeki TÜM etkinlikleri kapsıyorsa seçim gerekmez.
  // (16'lı seviyeler; ayrıca 8. Sınıf'ta 8'li paket = 8 etkinliğin tamamı.)
  const isFullPackageLevel = (level) => {
    const count = getLevelPackageCount(level)
    const maxForLevel = getMaxActivitiesForLevel(level)
    return Boolean(count && maxForLevel && count >= maxForLevel)
  }
  const levelsNeedingSelection = activeLevels.filter(level => !isFullPackageLevel(level))
  const levelsWithFullPackage = activeLevels.filter(level => isFullPackageLevel(level))
  const shouldShowPackageSelection = levelsNeedingSelection.length > 0
  const shouldShowReadOnlyProductList = levelsWithFullPackage.length > 0
  // Kullanıcı bu seviye için paket tipini elle seçmek zorunda mı?
  const needsManualPackageChoice = (level) => !packageCountByLevel[level] && selectablePackageCounts.length > 1
  const setLevelPackageCount = (level, nextCountRaw) => {
    const nextCountRawParsed = parseInt(nextCountRaw, 10)
    const maxForLevel = getMaxActivitiesForLevel(level)
    // Kapasiteyi aşan paket seçimini engelle (8. Sınıf > 8 olamaz)
    if (maxForLevel && nextCountRawParsed > maxForLevel) {
      alert(`${level} seviyesinde toplam ${maxForLevel} etkinlik bulunuyor. ${nextCountRawParsed}'li paket seçilemez.`)
      return
    }
    const nextCount = nextCountRawParsed
    if (!selectablePackageCounts.includes(nextCount)) {
      setSelectedPackageByLevel(prev => {
        const next = { ...prev }
        delete next[level]
        return next
      })
      setSelectedActivitiesByLevel(prev => ({ ...prev, [level]: [] }))
      return
    }
    setSelectedPackageByLevel(prev => ({ ...prev, [level]: nextCount }))
    setSelectedActivitiesByLevel(prev => {
      const current = prev[level] || []
      const availableOptions = getActivityOptionsForLevel(level)
      const validCurrent = current.filter(activity => availableOptions.includes(activity))
      return { ...prev, [level]: validCurrent.slice(0, nextCount) }
    })
  }
  const getSelectedStemValue = (planKey, shipmentKey) => selectedStemByPlan[planKey]?.[shipmentKey] || ''
  const setStemSelection = (planKey, shipmentKey, activityName) => {
    setSelectedStemByPlan(prev => ({
      ...prev,
      [planKey]: {
        ...(prev[planKey] || {}),
        [shipmentKey]: activityName,
      }
    }))
  }
  const getValidSelectedActivities = (level) => {
    const availableOptions = getActivityOptionsForLevel(level)
    const selectedActivities = selectedActivitiesByLevel[level] || []
    return availableOptions.length > 0
      ? selectedActivities.filter(activity => availableOptions.includes(activity))
      : []
  }
  const formatActivityListWithCounts = (activities = []) => {
    const counts = {}
    activities.forEach(activity => {
      if (!activity) return
      counts[activity] = (counts[activity] || 0) + 1
    })
    return Object.entries(counts).map(([activity, count]) => count > 1 ? `${activity} (x${count})` : activity)
  }
  const packageSelectionInfoText = getPackageInfoText(selectablePackageConfigs)
  const packageTitleText = getPackageTitleText(packageSelectionConfigs)
  const stemSelectionSummary = stemPlanConfigs.flatMap(plan => (
    plan.shipments.map(shipment => ({
      level: `${plan.label} / ${shipment.label}`,
      activities: getSelectedStemValue(plan.planKey, shipment.key) ? [getSelectedStemValue(plan.planKey, shipment.key)] : [],
    }))
  ))
  const selectedActivitySummary = [
    ...activeLevels.map(level => ({
      level,
      packageCount: isFullPackageLevel(level) ? getMaxActivitiesForLevel(level) : getLevelPackageCount(level),
      activities: isFullPackageLevel(level)
        ? getActivityOptionsForLevel(level)
        : formatActivityListWithCounts(getValidSelectedActivities(level))
    })),
    ...stemSelectionSummary,
  ]
  const classRowsForExport = classItems.filter(i => i.grade && parseInt(i.qty) > 0)
  const activitiesByLevelForExport = Object.fromEntries(
    selectedActivitySummary
      .map(item => [item.level, item.activities])
      .filter(([, activities]) => (activities || []).length > 0)
  )
  const getFormValidationError = () => {
    if (!String(schoolName || '').trim()) return 'Kurum adı zorunludur.'
    if (!String(cariAdi || '').trim()) return 'Cari adı zorunludur.'
    if (!taxNo || !taxOffice || !address || !contactName || !contactPhone || !contactEmail) return 'Vergi, adres ve yetkili bilgileri eksiksiz doldurulmalıdır.'
    const validItems = classItems.filter(i => i.grade && parseInt(i.qty) > 0)
    if (validItems.length === 0) return 'En az bir sınıf satırı doldurulmalıdır.'
    const invalidTeacherInfoRow = validItems.find(i =>
      !String(i.branch || '').trim() ||
      !String(i.teacher || '').trim() ||
      !String(i.teacher_email || '').trim() ||
      !String(i.teacher_phone || '').trim()
    )
    if (invalidTeacherInfoRow) return `${invalidTeacherInfoRow.grade || 'Seçili sınıf'} satırında şube, öğretmen adı, mail ve telefon zorunludur.`
    if (qtyMismatchMessage) return qtyMismatchMessage
    if (levelsNeedingSelection.length > 0) {
      const missingPackageLevel = levelsNeedingSelection.find(level => !getLevelPackageCount(level))
      if (missingPackageLevel) return `${missingPackageLevel} için paket tipini seçiniz.`
      // Seviyede var olan etkinlik sayısından fazla paket seçilemez
      // (8. Sınıf'ta yalnızca 8 etkinlik var; 12'li/16'lı seçilemez.)
      const overCapacityLevel = levelsNeedingSelection.map(level => {
        const maxForLevel = getMaxActivitiesForLevel(level)
        const required = getLevelPackageCount(level) || 0
        return maxForLevel > 0 && required > maxForLevel ? { level, required, maxForLevel } : null
      }).find(Boolean)
      if (overCapacityLevel) return `${overCapacityLevel.level} için en fazla ${overCapacityLevel.maxForLevel} etkinlik bulunuyor, ${overCapacityLevel.required}'li paket seçilemez.`
      const invalidSelection = levelsNeedingSelection.map(level => {
        const availableOptions = getActivityOptionsForLevel(level)
        if (availableOptions.length === 0) return null
        const selectedForLevel = getValidSelectedActivities(level)
        const requiredSelectionsForLevel = getLevelPackageCount(level) || 0
        return selectedForLevel.length !== requiredSelectionsForLevel
          ? { level, selected: selectedForLevel.length, required: requiredSelectionsForLevel }
          : null
      }).find(Boolean)
      if (invalidSelection) return `${invalidSelection.level} için ${invalidSelection.required} ürün seçimi zorunludur (seçili: ${invalidSelection.selected}).`
    }
    if (shouldShowStemSelection) {
      const invalidStemSelection = stemPlanConfigs
        .flatMap(plan => plan.shipments.map(shipment => ({ plan, shipment })))
        .find(({ plan, shipment }) => {
          const selectedValue = getSelectedStemValue(plan.planKey, shipment.key)
          return !shipment.options.includes(selectedValue)
        })
      if (invalidStemSelection) return `${invalidStemSelection.plan.label} / ${invalidStemSelection.shipment.label} için bir STEM etkinliği seçiniz!`
    }
    return ''
  }

  const addClassItem = () => {
    setClassItems(prev => [...prev, { grade: '1. Sınıf', branch: '', teacher: '', teacher_email: '', teacher_phone: '', qty: '' }])
  }
  const removeClassItem = (idx) => {
    setClassItems(prev => prev.filter((_, i) => i !== idx))
  }
  const updateClassItem = (idx, field, value) => {
    setClassItems(prev => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next })
  }
  const getActivityCount = (grade, activityName) => {
    const selected = selectedActivitiesByLevel[grade] || []
    return selected.filter(name => name === activityName).length
  }
  // Etkinlik seçimi TİK ile yapılır: seçili = 1, değil = 0. Adet girişi yok.
  const isActivitySelected = (grade, activityName) => getActivityCount(grade, activityName) > 0
  const toggleActivity = (grade, activityName) => {
    setSelectedActivitiesByLevel(prev => {
      const current = prev[grade] || []
      const availableOptions = getActivityOptionsForLevel(grade)
      const validCurrent = current.filter(activity => availableOptions.includes(activity))
      const alreadySelected = validCurrent.includes(activityName)
      if (alreadySelected) {
        return { ...prev, [grade]: validCurrent.filter(name => name !== activityName) }
      }
      // Sert üst sınır: paket adedi ve seviye kapasitesi aşılamaz
      const maxForLevel = getMaxActivitiesForLevel(grade)
      const limit = Math.min(
        getLevelPackageCount(grade) || 0,
        maxForLevel || (getLevelPackageCount(grade) || 0)
      )
      // Tik ile seçimde aynı etkinlik tekrar eklenmez, benzersiz liste tutulur
      const uniqueCurrent = [...new Set(validCurrent)]
      if (limit && uniqueCurrent.length >= limit) return prev
      return { ...prev, [grade]: [...uniqueCurrent, activityName] }
    })
  }
  const setActivityCount = (grade, activityName, nextCount) => {
    setSelectedActivitiesByLevel(prev => {
      const current = prev[grade] || []
      const availableOptions = getActivityOptionsForLevel(grade)
      const validCurrent = current.filter(activity => availableOptions.includes(activity))
      const safeNextCount = Math.max(0, parseInt(nextCount, 10) || 0)
      // Sert üst sınır: paket adedi de, seviyedeki etkinlik sayısı da aşılamaz
      const maxForLevel = getMaxActivitiesForLevel(grade)
      const requiredSelectionsForLevel = Math.min(
        getLevelPackageCount(grade) || 0,
        maxForLevel || (getLevelPackageCount(grade) || 0)
      )
      const currentCount = validCurrent.filter(name => name === activityName).length
      const withoutCurrent = validCurrent.length - currentCount
      const maxAllowedForActivity = Math.max(requiredSelectionsForLevel - withoutCurrent, 0)
      const finalCount = Math.min(safeNextCount, maxAllowedForActivity)
      const nextForGrade = validCurrent
        .filter(name => name !== activityName)
        .concat(Array.from({ length: finalCount }, () => activityName))
      return { ...prev, [grade]: nextForGrade }
    })
  }
  const handleDownloadReport = () => {
    downloadSchoolFormReport({
      form,
      classRows: classRowsForExport,
      activitiesByLevel: activitiesByLevelForExport,
      filenamePrefix: 'okul-formu',
    })
  }

  const save = async () => {
    if (isApproved) { alert('Bu form bayi tarafından onaylandı, artık güncellenemez.'); return }
    // Eksik alan varsa SESSİZ KALMA — kullanıcıya nedenini söyle
    const validationError = getFormValidationError()
    if (validationError) {
      setFormError(validationError)
      alert(validationError)
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setFormError('')
    const validItems = classItems.filter(i => i.grade && parseInt(i.qty) > 0)
    setSaving(true)
    const nextStatus = 'form_kaydedildi'

    await supabase.from('school_forms').update({
      school_name: schoolName, tax_no: taxNo, tax_office: taxOffice,
      address, contact_name: contactName, contact_phone: contactPhone,
      contact_email: contactEmail, status: nextStatus
    }).eq('id', form.id)
    // Cari adı ön siparişte tutulur (pre_orders.cari_adi kolonu mevcut)
    await supabase.from('pre_orders')
      .update({ status: nextStatus, cari_adi: String(cariAdi || '').trim() })
      .eq('id', form.pre_order_id)
    setForm(prev => prev ? ({
      ...prev,
      school_name: schoolName,
      tax_no: taxNo,
      tax_office: taxOffice,
      address,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      status: nextStatus,
    }) : prev)
    setPreOrder(prev => prev ? ({ ...prev, status: nextStatus, cari_adi: String(cariAdi || '').trim() }) : prev)

    await supabase.from('school_form_items').delete().eq('form_id', form.id)
    const classRowsToSave = validItems.map(i => ({
      form_id: form.id, grade: i.grade, branch: i.branch,
      teacher: String(i.teacher || '').trim(),
      teacher_email: String(i.teacher_email || '').trim(),
      teacher_phone: String(i.teacher_phone || '').trim(),
      qty: parseInt(i.qty)
    }))
    const selectedPackageActivityRows = levelsNeedingSelection.length > 0
      ? levelsNeedingSelection.flatMap(level => {
        const availableOptions = getActivityOptionsForLevel(level)
        if (availableOptions.length === 0) return []
        // Son güvenlik: seviyede var olan etkinlik sayısından fazlası kaydedilmez
        const capacityForLevel = Math.min(
          getLevelPackageCount(level) || availableOptions.length,
          availableOptions.length
        )
        const selectedForLevel = (selectedActivitiesByLevel[level] || [])
          .filter(activityName => availableOptions.includes(activityName))
          .slice(0, capacityForLevel)
        const countMap = selectedForLevel.reduce((acc, activityName) => {
          acc[activityName] = (acc[activityName] || 0) + 1
          return acc
        }, {})
        return Object.entries(countMap).map(([activityName, activityCount]) => ({
            form_id: form.id,
            grade: ACTIVITY_MARKER_GRADE,
            branch: level,
            teacher: activityName,
            teacher_email: '',
            teacher_phone: '',
            qty: activityCount,
          }))
      })
      : []
    // TÜM aktif seviyeler için paket işaretçisi yazılır (16'lı olanlar dahil),
    // böylece detay ekranlarında hangi seviyenin kaçlı set aldığı görünür.
    const selectedPackageLevelRows = activeLevels.length > 0
      ? activeLevels.flatMap(level => {
        const packageCount = isFullPackageLevel(level)
          ? (packageCountByLevel[level] || getMaxActivitiesForLevel(level))
          : getLevelPackageCount(level)
        if (!packageCount) return []
        return [{
          form_id: form.id,
          grade: PRODUCT_MARKER_GRADE,
          branch: level,
          teacher: `${packageCount}'li`,
          teacher_email: '',
          teacher_phone: '',
          qty: packageCount,
        }]
      })
      : []
    const selectedStemRows = shouldShowStemSelection
      ? stemPlanConfigs.flatMap(plan => (
        plan.shipments.flatMap(shipment => {
          const selectedValue = getSelectedStemValue(plan.planKey, shipment.key)
          if (!shipment.options.includes(selectedValue)) return []
          return [{
            form_id: form.id,
            grade: ACTIVITY_MARKER_GRADE,
            branch: buildStemBranchKey(plan.planKey, shipment.key),
            teacher: selectedValue,
            teacher_email: '',
            teacher_phone: '',
            qty: 0,
          }]
        })
      ))
      : []
    await supabase.from('school_form_items').insert([...classRowsToSave, ...selectedPackageActivityRows, ...selectedPackageLevelRows, ...selectedStemRows])

    setSubmitted(true)
    setSaving(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: COLORS.primary, fontSize: 16 }}>Yükleniyor...</div>
    </div>
  )

  if (!form) return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#333' }}>Form bulunamadı</div>
        <div style={{ color: '#888', marginTop: 8 }}>Bu link geçersiz veya süresi dolmuş olabilir.</div>
      </div>
    </div>
  )

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: isMobile ? 18 : 32 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.green, marginBottom: 8 }}>{isApproved ? 'Form Onaylandı!' : 'Formunuz Alındı!'}</div>
        <div style={{ color: '#666', fontSize: 15 }}>
          {isApproved
            ? 'Formunuz bayi tarafından onaylandı. Aşağıdan formunuzu indirebilirsiniz.'
            : 'Bilgileriniz ilgili bayi tarafından onaylandıktan sonra siparişiniz kesinleşecektir.'}
        </div>
        <div style={{ marginTop: 24, padding: 16, background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Toplam Sınıf Adedi</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.primary }}>{classItems.reduce((s, i) => s + (parseInt(i.qty) || 0), 0)}</div>
        </div>
        {(shouldShowPackageSelection || shouldShowReadOnlyProductList || shouldShowStemSelection) && selectedActivitySummary.some(item => item.activities.length > 0) && (
          <div style={{ marginTop: 12, textAlign: 'left', padding: 14, background: 'linear-gradient(180deg, #ffffff 0%, #faf7ff 100%)', border: '1px solid #ebe3ff', borderRadius: 14, boxShadow: '0 8px 24px rgba(140,71,156,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>🧩</span>
              <div style={{ fontSize: 14, color: COLORS.primary, fontWeight: 800 }}>Seviye Bazlı Ürün Listesi</div>
            </div>
            <div style={{ fontSize: 12, color: '#7b7790', marginBottom: 10 }}>
              Formunuza kaydedilen ürünler aşağıda seviyelere göre listelenir.
            </div>
            <div style={{ display: 'grid', gap: 8, maxHeight: isMobile ? 260 : 320, overflowY: 'auto', paddingRight: 2 }}>
              {selectedActivitySummary.map(item => (
                <div key={item.level} style={{ background: '#fff', border: '1px solid #eee8ff', borderRadius: 10, padding: '9px 10px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 800, color: COLORS.primary, background: '#f3edff', borderRadius: 999, padding: '4px 8px', marginBottom: 8 }}>
                    {item.level}
                  </div>
                  {item.packageCount ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 8, marginLeft: 6, fontSize: 11, fontWeight: 800, color: '#fff', background: COLORS.primary, borderRadius: 999, padding: '3px 9px' }}>
                      {item.packageCount}'li set
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 8, marginLeft: 6, fontSize: 11, fontWeight: 800, color: COLORS.orange, background: '#fff7ed', borderRadius: 999, padding: '3px 9px' }}>
                      paket seçilmedi
                    </span>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {item.activities.length > 0 ? item.activities.map((activity, idx) => (
                      <span key={`${item.level}-${activity}-${idx}`} style={{ fontSize: 11, fontWeight: 700, color: '#4a4660', background: '#f8f6ff', border: '1px solid #e8e0ff', borderRadius: 999, padding: '4px 8px' }}>
                        {activity}
                      </span>
                    )) : (
                      <span style={{ fontSize: 12, color: '#999' }}>Seçim yok</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={S.btn(COLORS.teal)} onClick={handleDownloadReport}>Formu İndir</button>
          {!isApproved && <button style={S.btn(COLORS.primary)} onClick={() => setSubmitted(false)}>Formu Güncelle</button>}
        </div>
        {isApproved && (
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: COLORS.green }}>
            Onaylandı ✓ {approvalDateText ? `(${approvalDateText})` : ''}
          </div>
        )}
      </div>
    </div>
  )


  return (
    <div style={{ minHeight: '100vh', backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', fontFamily: 'inherit' }}>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, rgba(14,12,54,0.2) 0%, rgba(81,25,121,0.14) 46%, rgba(41,96,167,0.12) 100%)' }}>
        {/* Header */}
        <div style={{ background: 'rgba(140,71,156,0.72)', padding: '14px 20px', boxShadow: '0 8px 30px rgba(23,11,50,0.12)' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 14, flexDirection: isMobile ? 'column' : 'row' }}>
            <img src={kesifKutusuLogo} alt="Keşif Kutusu" style={{ width: 180, maxWidth: '44vw', height: 'auto' }} />
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Sipariş Bilgi Formu</div>
          </div>
        </div>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '16px 12px' : '28px 20px' }}>
        <div style={{ ...S.card, borderLeft: '4px solid ' + COLORS.teal, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>📘 Kazanım Tablosu</div>
          <a
            href="https://www.kesifkutusu.com.tr/kazan%C4%B1m-dosyas%C4%B1"
            target="_blank"
            rel="noreferrer"
            style={{ color: COLORS.teal, fontSize: 14, fontWeight: 700, textDecoration: 'underline' }}
          >
            Detaylı kazanım dosyasını buradan inceleyin
          </a>
        </div>

        {/* Sipariş özeti */}
        {preOrder && (
          <div style={{ ...S.card, borderLeft: '4px solid ' + COLORS.teal }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.teal, marginBottom: 12 }}>📦 Sipariş Özeti</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              <div><span style={{ fontSize: 11, color: '#888' }}>SEZON</span><div style={{ fontWeight: 700 }}>{preOrder.season}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>TOPLAM ADET</span><div style={{ fontWeight: 700 }}>{orderQtyTotal} adet</div></div>
            </div>
            <div style={{ marginTop: 12 }}>
              {orderItems.map((item, idx) => (
                <div key={idx} style={{ fontSize: 13, color: '#555', padding: '4px 0', borderBottom: '1px solid #f0e8ff' }}>
                  • {item.qty} adet — {productsById[item.product_id] || `Ürün #${item.product_id}`}
                </div>
              ))}
            </div>
          </div>
        )}
        {packageSelectionConfigs.length > 0 && (
          <div style={{ ...S.card, borderLeft: '4px solid ' + COLORS.yellow }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.primary, marginBottom: 6 }}>{packageTitleText}</div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {isAutoFilledMode
                ? "Sınıf seviyeleri ve ürün seçimleri sipariş adetlerine göre otomatik dolduruldu. Gerekli alanları düzenleyip formu gönderiniz."
                : shouldShowPackageSelection
                ? packageSelectionInfoText
                : "16'lı pakette tüm ürünler dahil edilir; aşağıda ürün listesi seçimsiz olarak gösterilir."}
            </div>
          </div>
        )}

        {formError && (
          <div style={{ ...S.card, borderLeft: '4px solid ' + COLORS.orange, background: '#fff7ed' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.orange }}>Form gönderilemedi</div>
            <div style={{ fontSize: 13, color: '#7c2d12', marginTop: 4 }}>{formError}</div>
          </div>
        )}

        {/* Kurum Bilgileri */}
        <div style={S.card}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginBottom: 20 }}>Kurum Bilgileri</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <div>
              <label style={S.label}>Kurum Adı *</label>
              <input style={S.input} value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="Okul / Kurum adı" />
            </div>
            <div>
              <label style={S.label}>Cari Adı *</label>
              <input style={S.input} value={cariAdi} onChange={e => setCariAdi(e.target.value)} placeholder="Faturada yer alacak cari adı" />
            </div>
            <div>
              <label style={S.label}>Vergi No</label>
              <input style={S.input} value={taxNo} onChange={e => setTaxNo(e.target.value)} placeholder="1234567890" />
            </div>
            <div>
              <label style={S.label}>Vergi Dairesi</label>
              <input style={S.input} value={taxOffice} onChange={e => setTaxOffice(e.target.value)} placeholder="Vergi dairesi adı" />
            </div>
            <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
              <label style={S.label}>Adres</label>
              <input style={S.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="Tam adres" />
            </div>
            <div>
              <label style={S.label}>Yetkili Kişi</label>
              <input style={S.input} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ad Soyad" />
            </div>
            <div>
              <label style={S.label}>Yetkili Telefon</label>
              <input style={S.input} value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="0555 555 55 55" />
            </div>
            <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
              <label style={S.label}>Yetkili E-posta</label>
              <input style={S.input} value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="ornek@okul.edu.tr" />
            </div>
          </div>
        </div>

        {/* Sınıf Dağılımı */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary }}>Sınıf Dağılımı</div>
            <button style={{ ...S.btn(COLORS.teal), fontSize: 12, padding: '7px 14px' }} onClick={addClassItem}>+ Sınıf Ekle</button>
          </div>
          {isAutoFilledMode && (
            <div style={{ marginTop: -8, marginBottom: 12, fontSize: 12, color: '#666' }}>
              Sınıf satırları ön siparişten otomatik yüklendi; isterseniz bu tabloyu düzenleyebilirsiniz.
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: COLORS.primary + '11' }}>
                  <th style={{ ...S.th, width: 130 }}>Sınıf Seviyesi</th>
                  <th style={{ ...S.th, width: 70 }}>Şube</th>
                  <th style={S.th}>Öğretmen Adı</th>
                  <th style={S.th}>Öğretmen Mail</th>
                  <th style={S.th}>Öğretmen Tel</th>
                  <th style={{ ...S.th, width: 80 }}>Adet</th>
                  <th style={{ ...S.th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {classItems.map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#faf6ff' }}>
                    <td style={S.td}>
                      <select style={{ ...S.select, fontSize: 12, padding: '7px 8px', background: '#fff' }} value={item.grade} onChange={e => updateClassItem(idx, 'grade', e.target.value)}>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      {/* Seviyenin kaçlı set aldığı sınıf satırında da görünür */}
                      {(() => {
                        const rowQty = parseInt(item.qty, 10) || 0
                        if (!item.grade || rowQty <= 0) return null
                        const rowPackageCount = getLevelPackageCount(item.grade)
                        const rowMax = getMaxActivitiesForLevel(item.grade)
                        return (
                          <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                            {rowPackageCount ? (
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: COLORS.primary, borderRadius: 999, padding: '2px 7px' }}>
                                {rowPackageCount}'li set
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.orange, background: '#fff7ed', borderRadius: 999, padding: '2px 7px' }}>
                                paket seçilmedi
                              </span>
                            )}
                            {rowMax > 0 && (
                              <span style={{ fontSize: 10, color: '#8a86a0', fontWeight: 600 }}>
                                (max {rowMax} etkinlik)
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.input, textAlign: 'center', fontSize: 12, padding: '7px 8px', background: '#fff' }} value={item.branch} onChange={e => updateClassItem(idx, 'branch', e.target.value)} placeholder="A" />
                    </td>
                    <td style={S.td}>
                      <input required style={{ ...S.input, fontSize: 12, padding: '7px 8px', background: '#fff' }} value={item.teacher} onChange={e => updateClassItem(idx, 'teacher', e.target.value)} placeholder="Ad Soyad *" />
                    </td>
                    <td style={S.td}>
                      <input required type="email" style={{ ...S.input, fontSize: 12, padding: '7px 8px', background: '#fff' }} value={item.teacher_email} onChange={e => updateClassItem(idx, 'teacher_email', e.target.value)} placeholder="mail@okul.com *" />
                    </td>
                    <td style={S.td}>
                      <input required style={{ ...S.input, fontSize: 12, padding: '7px 8px', background: '#fff' }} value={item.teacher_phone} onChange={e => updateClassItem(idx, 'teacher_phone', e.target.value)} placeholder="0555... *" />
                    </td>
                    <td style={S.td}>
                      <input type="number" min="0" style={{ ...S.input, textAlign: 'center', fontSize: 12, padding: '7px 8px', background: '#fff' }} value={item.qty} onChange={e => updateClassItem(idx, 'qty', e.target.value)} placeholder="0" />
                    </td>
                    <td style={S.td}>
                      {idx > 0 && <button style={{ ...S.btn('#ef4444'), padding: '5px 8px', fontSize: 11 }} onClick={() => removeClassItem(idx)}>✕</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: COLORS.primary + '11' }}>
                  <td colSpan={5} style={{ ...S.td, fontWeight: 800, textAlign: 'right', color: COLORS.primary }}>TOPLAM ADET:</td>
                  <td style={{ ...S.td, fontWeight: 800, fontSize: 16, color: COLORS.primary }}>{totalQty}</td>
                  <td style={S.td}></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: qtyMismatchMessage ? COLORS.orange : COLORS.green, fontWeight: 700 }}>
            Sipariş adedi: {orderQtyTotal} • Form adedi: {totalQty}
          </div>
          {qtyMismatchMessage && (
            <div style={{ marginTop: 6, fontSize: 12, color: COLORS.orange }}>{qtyMismatchMessage}</div>
          )}
        </div>
        {/* ÜRÜN SEÇİMİ — SEVİYE BAZLI.
            Her sınıf seviyesi kendi paketine göre değerlendirilir:
            16'lı seviyelerde tüm etkinlikler dahildir (seçim yok),
            diğer seviyelerde paket adedi kadar etkinlik seçilir.
            Etkinlikler 1.Dönem / 2.Dönem olarak iki ayrı blokta gösterilir. */}
        {activeLevels.length > 0 && (packageSelectionConfigs.length > 0 || levelsNeedingSelection.length > 0) && (
          <div style={S.card}>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>Ürün Listesi</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>
              Her sınıf seviyesi için paket tipine göre etkinlik seçimi yapılır. 16'lı pakette seçim gerekmez, tüm etkinlikler dahildir.
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {activeLevels.map(level => {
                const blocks = getActivityBlocksForLevel(level)
                const availableOptions = getActivityOptionsForLevel(level)
                const isFull = isFullPackageLevel(level)
                const selectedForLevel = getValidSelectedActivities(level)
                const requiredSelectionsForLevel = isFull ? availableOptions.length : getLevelPackageCount(level)
                const canSelectActivities = !isFull && Boolean(requiredSelectionsForLevel)
                const maxForLevel = getMaxActivitiesForLevel(level)
                const overCapacity = !isFull && requiredSelectionsForLevel > 0 && maxForLevel > 0 && requiredSelectionsForLevel > maxForLevel
                return (
                  <div key={level} style={{ border: '1px solid #ece6ff', borderRadius: 12, padding: 12, background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexDirection: isMobile ? 'column' : 'row' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: COLORS.primary }}>{level}</span>
                        {requiredSelectionsForLevel > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: COLORS.primary, borderRadius: 999, padding: '2px 8px' }}>
                            {requiredSelectionsForLevel}'li set
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
                        {needsManualPackageChoice(level) && (
                          <select
                            style={{ ...S.select, width: isMobile ? '100%' : 140, padding: '6px 8px', fontSize: 12 }}
                            value={getLevelPackageCount(level) || ''}
                            onChange={e => setLevelPackageCount(level, e.target.value)}
                          >
                            <option value="">Paket Seç</option>
                            {selectablePackageCounts.filter(count => count <= maxForLevel || maxForLevel === 0).map(count => (
                              <option key={`package-${level}-${count}`} value={count}>{count}'li</option>
                            ))}
                          </select>
                        )}
                        {isFull ? (
                          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green }}>Tümü dahil (seçim gerekmez)</div>
                        ) : (
                          <div style={{ fontSize: 12, fontWeight: 700, color: canSelectActivities && selectedForLevel.length === requiredSelectionsForLevel ? COLORS.green : COLORS.orange }}>
                            {canSelectActivities ? `${selectedForLevel.length}/${requiredSelectionsForLevel} seçildi` : 'Paket seçiniz'}
                          </div>
                        )}
                      </div>
                    </div>
                    {overCapacity && (
                      <div style={{ fontSize: 12, color: COLORS.orange, fontWeight: 700, marginBottom: 8 }}>
                        Bu seviyede toplam {maxForLevel} etkinlik bulunuyor, {requiredSelectionsForLevel}'li paket seçilemez.
                      </div>
                    )}
                    {blocks.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#999' }}>Bu seviye için etkinlik listesi bulunamadı.</div>
                    ) : !isFull && !canSelectActivities ? (
                      <div style={{ fontSize: 12, color: '#999' }}>Bu seviyede ürün seçimine başlamadan önce paket tipi seçiniz.</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {blocks.map(block => (
                          <div key={`${level}-${block.term}`} style={{ border: '1px solid #f0ecff', borderRadius: 10, padding: 10, background: '#fcfbff' }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.teal, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                              {block.term}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                              {block.activities.map(activityName => {
                                if (isFull) {
                                  return (
                                    <div key={`${level}-readonly-${activityName}`} style={{ fontSize: 12, color: '#333', fontWeight: 600, padding: '6px 8px', borderRadius: 8, background: '#f7f3ff' }}>{activityName}</div>
                                  )
                                }
                                const selected = isActivitySelected(level, activityName)
                                const limitReached = selectedForLevel.length >= requiredSelectionsForLevel
                                const disabled = !selected && limitReached
                                return (
                                  <label
                                    key={`${level}-${activityName}`}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                                      background: selected ? '#f7f3ff' : '#fafafa',
                                      border: selected ? `1px solid ${COLORS.primary}33` : '1px solid transparent',
                                      cursor: disabled ? 'not-allowed' : 'pointer',
                                      opacity: disabled ? 0.5 : 1,
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      disabled={disabled}
                                      onChange={() => toggleActivity(level, activityName)}
                                      style={{ width: 16, height: 16, accentColor: COLORS.primary, cursor: disabled ? 'not-allowed' : 'pointer' }}
                                    />
                                    <span style={{ fontSize: 12, color: '#333', fontWeight: 600, flex: 1 }}>{activityName}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {shouldShowStemSelection && (
          <div style={S.card}>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>STEM Ürün Seçimleri</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Her sevkiyat için 1 etkinlik seçiniz.</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {stemPlanConfigs.map(plan => (
                <div key={plan.planKey} style={{ border: '1px solid #ece6ff', borderRadius: 12, padding: 12, background: '#fff' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.primary, marginBottom: 10 }}>{plan.label}</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {plan.shipments.map(shipment => {
                      const selectedValue = getSelectedStemValue(plan.planKey, shipment.key)
                      return (
                        <div key={`${plan.planKey}-${shipment.key}`} style={{ border: '1px solid #f0e8ff', borderRadius: 10, padding: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.primary }}>{shipment.label}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: selectedValue ? COLORS.green : COLORS.orange }}>
                              {selectedValue ? 'Seçildi' : 'Seçim bekleniyor'}
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                            {shipment.options.map(activityName => {
                              const checked = selectedValue === activityName
                              return (
                                <label key={`${plan.planKey}-${shipment.key}-${activityName}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: checked ? '#f7f3ff' : '#fafafa', cursor: 'pointer' }}>
                                  <input type="radio" name={`stem-${plan.planKey}-${shipment.key}`} checked={checked} onChange={() => setStemSelection(plan.planKey, shipment.key, activityName)} />
                                  <span style={{ fontSize: 12, color: '#333', fontWeight: 600 }}>{activityName}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end', gap: 12 }}>
          <button style={{ ...S.btn(COLORS.primary), fontSize: 15, padding: '12px 28px', width: isMobile ? '100%' : 'auto' }} onClick={save} disabled={saving}>
            {saving ? 'Gönderiliyor...' : 'Formu Gönder 🚀'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}