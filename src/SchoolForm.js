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
const ACTIVITY_OPTIONS_BY_GRADE = {
  '4 Yaş': [
    'Köpüren Dinozor',
    'Dinozorlar Nerede?',
    'Benim Vücudum',
    'Galaksi Kavanozum',
    'Duygularımı Keşfediyorum',
    'Sevimli Balık',
    'Yağmuru Gözlemle!',
    'Islanmayan Resim',
    'Renklerin Gizemi',
    'Bilim Kokusu',
    'İz Peşinde',
    'Çılgın Bilim',
    'Büyüteçle Keşif Zamanı',
    'Keşif Dürbünü',
    'Bitki Hazinem',
    'Kuş Yemliği',
  ],
  '5-6 Yaş': [
    'İlk Sabunum',
    'Benim Galaksim',
    'Yapay Kar',
    'Gölge oyunu / Şekiller',
    'Üflemeden Balon Şişer Mi?',
    'Kayan Balık',
    'Renklerin Ahengi',
    'Sınıfımda Müze',
    'Canavar Poşet',
    'Su Döngüsü',
    'Orman Katmanları Modeli',
    'Yanardağ Patlıyor!',
    'Canlıların Yaşam Döngüsü',
    'Rüzgar Gülü Yapıyorum',
    'Sesle Zıplayan Toplar',
    'Bitkimi Yetiştiriyorum',
  ],
  '1. Sınıf': [
    'Bilimle Boyama',
    'Ses Topu',
    'Ay Taşı Yapalım!',
    'Doğanın Kokusu',
    'Keşif Aracı',
    'Güvenli Şehrim',
    'Dans Eden Kemikler',
    'Benim Sağlıklı Tabağım',
    'Nasıl Nefes Alıyoruz?',
    'Lav Lambası',
    'Ülkemin Güzellikleri',
    'Işıklı Uçağım',
    'Tohum Günlüğü',
    'Büyüteç Yapımı',
    'Mis Kokulu Kremim',
    'Rüzgar Dedektifleri',
  ],
  '2. Sınıf': [
    'Renkli Köpükler',
    'Minik Dostuma Hediye',
    'İlk Diş Macunum',
    'Vitamin Avcıları',
    'Siren Üretimi',
    'Katı mı? Sıvı mı?',
    'Rüzgar Türbinim',
    'Parmak İzim',
    'STEM Deprem Etkinliği',
    'Tarihi Şekillendir',
    'İklim Kahramanları',
    'Hortum Oluşumu',
    'Ekolojik Denge',
    'Işıldayan Kart',
    'Model Uçak',
    'Mikro Filiz',
  ],
  '3. Sınıf': [
    "Dünya'nın Katmanları",
    '3-2-1 Fırla!',
    'Kurbağanın Yaşam Döngüsü',
    'Parfüm Üretimi',
    'Madenciler İş Başında!',
    'Gizemli Hâller',
    'Karışımların Ayrılması',
    'Medeniyet Hamuru',
    'Hava ile Giden Araba',
    'Mancınıkla Fırlat',
    'Elektriğin Gücü',
    'Kar Küresi',
    'Belirteç Deneyi',
    'Tohum Topu',
    'Çiftlik Evim',
    'Yaşam Kürem',
  ],
  '4. Sınıf': [
    'Paleontologlar İş Başında',
    'Gece Gündüz Oluşumu',
    'Tabağımı Keşfediyorum',
    'Şekerimin Dozu',
    'Suda Giden Gemi',
    'Mıknatısın Gücü',
    'Yoğunluk Kulesi',
    'Terazi Yapıyorum',
    'Karışımların Ayrılması',
    'Girişimcilik',
    'Kaleydoskop',
    'Sesten Harekete',
    'Karbon Ayak İzimiz',
    'Damla Sulama Yapalım!',
    'Ledli Bileklik',
    'İletkenlik Test Kiti',
  ],
  '5. Sınıf': [
    'Ayın Evreleri',
    'Güneş, Dünya ve Ay’ın Yolculuğu',
    'Dinamometre Yapımı',
    'Sürtünme Kuvvetinin Etkisi',
    'Bitki Hücresi',
    'İskeletim Nerede?',
    'Işığın Yolu',
    'Işık Geçirgenlik Test Kiti',
    'Gölgelerin Gücü Adına',
    'Güneş Saati',
    'Maddenin Doğası',
    'Termometre Yapımı',
    'Aydınlık Bir Gece',
    'Ampulüm Parlak',
    'Atıktan Filize',
    'Sürdürülebilir Enerji!',
  ],
  '6. Sınıf': [
    'Güneş Sistemi Projektörü',
    'Tutulmalar',
    'Bileşke Kuvvet',
    'Yolculuk',
    'Hücreler İş Başında!',
    'Güneş, Su, Mineral',
    'Beyin Devreleri',
    'Periskop',
    'Renk Çarkı',
    'Mum Yapımı',
    'Yoğunluk Tayini',
    'İletkenlik Avcıları',
    'Direnç Keşfi',
    'Teraryum Yapıyorum',
    'Temiz Suya Nasıl Ulaşırım?',
    'Krem Üretimi',
  ],
  '7. Sınıf': [
    'Teleskop Yapımı',
    'Uydu Modeli',
    'Kuvvetle İş Başında',
    'Enerji Kulesi',
    'Hidrolik Fren',
    'Büyük ve Küçük Kan Dolaşımı',
    'Solunum Sistemi Modeli',
    'Böbrekler Nasıl Süzüyor?',
    'Yanıltan Ok',
    'Işığın Kırılması',
    'Maddenin Yapısı',
    'Karışımlar',
    'Karışımları Ayıralım',
    'Elektroskop',
    'Kireç Suyu Neden Bulanır?',
    'Hayal Et, Tasarla, Üret',
  ],
  '8. Sınıf': [],
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
const getActivityOptionsForLevel = (level) => ACTIVITY_OPTIONS_BY_GRADE[level] || []
const PACKAGE_SELECTION_COUNTS = [4, 8, 12, 16]
const parsePackageSizeFromName = (name) => {
  const match = (name || '').match(/(\d+)\s*['’]?\s*l(?:ı|i|u|ü)/i)
  if (!match) return null
  const count = parseInt(match[1], 10)
  return Number.isFinite(count) ? count : null
}
const getPackageSelectionConfig = (orderItems, productsById) => {
  for (const item of orderItems || []) {
    const productName = productsById[item.product_id] || ''
    const count = parsePackageSizeFromName(productName)
    if (PACKAGE_SELECTION_COUNTS.includes(count)) {
      return { count, productName }
    }
  }
  return null
}
const getSelectionGroupRules = (requiredSelectionCount, availableOptions = []) => {
  if (!requiredSelectionCount) return []
  const firstGroupOptions = availableOptions.slice(0, 8)
  const secondGroupOptions = availableOptions.slice(8, 16)
  if (requiredSelectionCount === 12 && firstGroupOptions.length > 0 && secondGroupOptions.length > 0) {
    return [
      { key: 'first8', label: 'İlk 8 Ürün', required: 6, options: firstGroupOptions },
      { key: 'second8', label: 'İkinci 8 Ürün', required: 6, options: secondGroupOptions },
    ]
  }

  if (requiredSelectionCount === 8 && firstGroupOptions.length > 0 && secondGroupOptions.length > 0) {
    return [
      { key: 'first8', label: 'İlk 8 Ürün', required: 4, options: firstGroupOptions },
      { key: 'second8', label: 'İkinci 8 Ürün', required: 4, options: secondGroupOptions },
    ]
  }
  if (requiredSelectionCount === 4 && firstGroupOptions.length > 0 && secondGroupOptions.length > 0) {
    return [
      { key: 'first8', label: 'İlk 8 Ürün', required: 2, options: firstGroupOptions },
      { key: 'second8', label: 'İkinci 8 Ürün', required: 2, options: secondGroupOptions },
    ]
  }
  return [{ key: 'all', label: 'Ürünler', required: requiredSelectionCount, options: availableOptions }]
}


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
  const [taxNo, setTaxNo] = useState('')
  const [taxOffice, setTaxOffice] = useState('')
  const [address, setAddress] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  // Sınıf dağılımı
  const [classItems, setClassItems] = useState([{ grade: '1. Sınıf', branch: '', teacher: '', teacher_email: '', teacher_phone: '', qty: '' }])
  const [selectedActivitiesByLevel, setSelectedActivitiesByLevel] = useState({})
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

    // Daha once doldurulmusse yukle
    if (formData.school_name) {
      setSchoolName(formData.school_name)
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

    if (items && items.length > 0) {
      const classRows = []
      const selectedByLevel = {}
      const selectedStem = {}
      items.forEach(i => {
        if (i.grade === ACTIVITY_MARKER_GRADE) {
          const level = i.branch
          const activityName = (i.teacher || '').trim()
          const stemMeta = parseStemBranchKey(level)
          if (stemMeta && activityName) {
            if (!selectedStem[stemMeta.planKey]) selectedStem[stemMeta.planKey] = {}
            selectedStem[stemMeta.planKey][stemMeta.shipmentKey] = activityName
            return
          }
          if (level && activityName) {
            if (!selectedByLevel[level]) selectedByLevel[level] = []
            selectedByLevel[level].push(activityName)
          }
          return
        }
        if (i.grade === PRODUCT_MARKER_GRADE) {
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
            const uniqueActivities = [...new Set(activities)]
            return [
              level,
              availableOptions.length > 0
                ? uniqueActivities.filter(activity => availableOptions.includes(activity))
                : uniqueActivities
            ]
          })
        )
        setSelectedActivitiesByLevel(normalized)
      }
      if (Object.keys(selectedStem).length > 0) {
        setSelectedStemByPlan(selectedStem)
      }
    }

    if (po) setPreOrder(po)
    if (productRows) {
      const map = {}
      productRows.forEach(product => { map[product.id] = product.name })
      setProductsById(map)
    }

    if (formData.status === 'tamamlandi' || formData.status === 'onaylandi') setSubmitted(true)
    setLoading(false)
  }
  const totalQty = classItems.reduce((s, i) => s + (parseInt(i.qty) || 0), 0)
  const orderItems = preOrder?.pre_order_items || []
  const packageSelectionConfig = getPackageSelectionConfig(orderItems, productsById)
  const stemPlanConfigs = getStemPlanConfigs(orderItems, productsById)
  const requiredSelectionCount = [4, 8, 12].includes(packageSelectionConfig?.count || 0) ? packageSelectionConfig.count : 0
  const isSixteenPackage = packageSelectionConfig?.count === 16
  const shouldShowPackageSelection = requiredSelectionCount > 0
  const shouldShowReadOnlyProductList = isSixteenPackage
  const shouldShowStemSelection = stemPlanConfigs.length > 0
  const isApproved = form?.status === 'onaylandi'
  const activeLevels = [...new Set(classItems.filter(i => i.grade && parseInt(i.qty) > 0).map(i => i.grade))]
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
  const getSelectionGroupsForLevel = (level) => getSelectionGroupRules(requiredSelectionCount, getActivityOptionsForLevel(level))
  const getSelectedActivitiesForGroup = (selectedForLevel, group) => selectedForLevel.filter(activity => group.options.includes(activity))
  const packageSelectionInfoText = requiredSelectionCount === 8
    ? 'Her sınıf seviyesi için ilk 8 üründen 4, ikinci 8 üründen 4 seçiniz.'
    : requiredSelectionCount === 12
      ? 'Her sınıf seviyesi için ilk 8 üründen 6, ikinci 8 üründen 6 seçiniz.'
    : requiredSelectionCount === 4
      ? 'Her sınıf seviyesi için ilk 8 üründen 2, ikinci 8 üründen 2 seçiniz.'
      : `Her sınıf seviyesi için tam ${requiredSelectionCount} ürün seçiniz.`
  const stemSelectionSummary = stemPlanConfigs.flatMap(plan => (
    plan.shipments.map(shipment => ({
      level: `${plan.label} / ${shipment.label}`,
      activities: getSelectedStemValue(plan.planKey, shipment.key) ? [getSelectedStemValue(plan.planKey, shipment.key)] : [],
    }))
  ))
  const selectedActivitySummary = [
    ...activeLevels.map(level => ({
      level,
      activities: shouldShowReadOnlyProductList ? getActivityOptionsForLevel(level) : getValidSelectedActivities(level)
    })),
    ...stemSelectionSummary,
  ]
  const classRowsForExport = classItems.filter(i => i.grade && parseInt(i.qty) > 0)
  const activitiesByLevelForExport = Object.fromEntries(
    selectedActivitySummary
      .map(item => [item.level, item.activities])
      .filter(([, activities]) => (activities || []).length > 0)
  )

  const addClassItem = () => setClassItems(prev => [...prev, { grade: '1. Sınıf', branch: '', teacher: '', teacher_email: '', teacher_phone: '', qty: '' }])
  const removeClassItem = (idx) => setClassItems(prev => prev.filter((_, i) => i !== idx))
  const updateClassItem = (idx, field, value) => {
    setClassItems(prev => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next })
  }
  const toggleActivity = (grade, activityName) => {
    setSelectedActivitiesByLevel(prev => {
      const current = prev[grade] || []
      const availableOptions = getActivityOptionsForLevel(grade)
      const validCurrent = current.filter(activity => availableOptions.includes(activity))
      if (!current.includes(activityName) && shouldShowPackageSelection) {
        const groups = getSelectionGroupRules(requiredSelectionCount, availableOptions)
        const targetGroup = groups.find(group => group.options.includes(activityName))
        if (!targetGroup) return prev
        const selectedInTargetGroup = validCurrent.filter(activity => targetGroup.options.includes(activity))
        if (selectedInTargetGroup.length >= targetGroup.required) return prev
      }
      const nextForGrade = current.includes(activityName)
        ? current.filter(name => name !== activityName)
        : [...current, activityName]
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
    if (!schoolName) { alert('Kurum adı zorunludur!'); return }
    if (isApproved) { alert('Bu form bayi tarafından onaylandı, artık güncellenemez.'); return }
    const validItems = classItems.filter(i => i.grade && parseInt(i.qty) > 0)
    if (validItems.length === 0) { alert('En az bir sınıf satırı doldurulmalıdır!'); return }
    if (shouldShowPackageSelection) {
      const invalidSelection = activeLevels.map(level => {
        const availableOptions = getActivityOptionsForLevel(level)
        if (availableOptions.length === 0) return null
        const selectedForLevel = getValidSelectedActivities(level)
        const invalidGroup = getSelectionGroupRules(requiredSelectionCount, availableOptions)
          .find(group => getSelectedActivitiesForGroup(selectedForLevel, group).length !== group.required)
        return invalidGroup ? { level, invalidGroup } : null
      }).find(Boolean)
      if (invalidSelection) {
        alert(`${invalidSelection.level} için ${invalidSelection.invalidGroup.label} alanında tam ${invalidSelection.invalidGroup.required} ürün seçiniz!`)
        return
      }
    }
    if (shouldShowStemSelection) {
      const invalidStemSelection = stemPlanConfigs
        .flatMap(plan => plan.shipments.map(shipment => ({ plan, shipment })))
        .find(({ plan, shipment }) => {
          const selectedValue = getSelectedStemValue(plan.planKey, shipment.key)
          return !shipment.options.includes(selectedValue)
        })
      if (invalidStemSelection) {
        alert(`${invalidStemSelection.plan.label} / ${invalidStemSelection.shipment.label} için bir STEM etkinliği seçiniz!`)
        return
      }
    }
    setSaving(true)

    await supabase.from('school_forms').update({
      school_name: schoolName, tax_no: taxNo, tax_office: taxOffice,
      address, contact_name: contactName, contact_phone: contactPhone,
      contact_email: contactEmail, status: 'tamamlandi'
    }).eq('id', form.id)
    setForm(prev => prev ? ({
      ...prev,
      school_name: schoolName,
      tax_no: taxNo,
      tax_office: taxOffice,
      address,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      status: 'tamamlandi',
    }) : prev)

    await supabase.from('school_form_items').delete().eq('form_id', form.id)
    const classRowsToSave = validItems.map(i => ({
      form_id: form.id, grade: i.grade, branch: i.branch,
      teacher: i.teacher, teacher_email: i.teacher_email,
      teacher_phone: i.teacher_phone, qty: parseInt(i.qty)
    }))
    const selectedPackageActivityRows = shouldShowPackageSelection
      ? activeLevels.flatMap(level => {
        const availableOptions = getActivityOptionsForLevel(level)
        if (availableOptions.length === 0) return []
        return (selectedActivitiesByLevel[level] || [])
          .filter(activityName => availableOptions.includes(activityName))
          .map(activityName => ({
            form_id: form.id,
            grade: ACTIVITY_MARKER_GRADE,
            branch: level,
            teacher: activityName,
            teacher_email: '',
            teacher_phone: '',
            qty: 0,
          }))
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
    await supabase.from('school_form_items').insert([...classRowsToSave, ...selectedPackageActivityRows, ...selectedStemRows])

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
          <div style={{ marginTop: 12, padding: 14, background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Seviye Bazlı Ürün Listesi</div>
            {selectedActivitySummary.map(item => (
              <div key={item.level} style={{ fontSize: 13, color: '#333', fontWeight: 600, marginBottom: 4 }}>
                {item.level}: {item.activities.length > 0 ? item.activities.join(', ') : '-'}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={S.btn(COLORS.teal)} onClick={handleDownloadReport}>Formu İndir</button>
          {!isApproved && <button style={S.btn(COLORS.primary)} onClick={() => setSubmitted(false)}>Formu Güncelle</button>}
        </div>
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
            Detaylı kazanım tablosunu buradan indirin
          </a>
        </div>

        {/* Sipariş özeti */}
        {preOrder && (
          <div style={{ ...S.card, borderLeft: '4px solid ' + COLORS.teal }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.teal, marginBottom: 12 }}>📦 Sipariş Özeti</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              <div><span style={{ fontSize: 11, color: '#888' }}>SEZON</span><div style={{ fontWeight: 700 }}>{preOrder.season}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>TOPLAM ADET</span><div style={{ fontWeight: 700 }}>{orderItems.reduce((s, i) => s + (i.qty || 0), 0)} adet</div></div>
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
        {packageSelectionConfig && (
          <div style={{ ...S.card, borderLeft: '4px solid ' + COLORS.yellow }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.primary, marginBottom: 6 }}>{packageSelectionConfig.count}'li Keşif Kutusu</div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {shouldShowPackageSelection
                ? packageSelectionInfoText
                : "16'lı pakette tüm ürünler dahil edilir; aşağıda ürün listesi seçimsiz olarak gösterilir."}
            </div>
          </div>
        )}

        {/* Kurum Bilgileri */}
        <div style={S.card}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginBottom: 20 }}>Kurum Bilgileri</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
              <label style={S.label}>Kurum Adı *</label>
              <input style={S.input} value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="Okul / Kurum adı" />
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
                      <select style={{ ...S.select, fontSize: 12, padding: '7px 8px' }} value={item.grade} onChange={e => updateClassItem(idx, 'grade', e.target.value)}>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.input, textAlign: 'center', fontSize: 12, padding: '7px 8px' }} value={item.branch} onChange={e => updateClassItem(idx, 'branch', e.target.value)} placeholder="A" />
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.input, fontSize: 12, padding: '7px 8px' }} value={item.teacher} onChange={e => updateClassItem(idx, 'teacher', e.target.value)} placeholder="Ad Soyad" />
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.input, fontSize: 12, padding: '7px 8px' }} value={item.teacher_email} onChange={e => updateClassItem(idx, 'teacher_email', e.target.value)} placeholder="mail@okul.com" />
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.input, fontSize: 12, padding: '7px 8px' }} value={item.teacher_phone} onChange={e => updateClassItem(idx, 'teacher_phone', e.target.value)} placeholder="0555..." />
                    </td>
                    <td style={S.td}>
                      <input type="number" min="0" style={{ ...S.input, textAlign: 'center', fontSize: 12, padding: '7px 8px' }} value={item.qty} onChange={e => updateClassItem(idx, 'qty', e.target.value)} placeholder="0" />
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
        </div>

        {shouldShowPackageSelection && (
          <div style={S.card}>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>{requiredSelectionCount}'li Keşif Kutusu Ürün Listesi</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>{packageSelectionInfoText}</div>
            {activeLevels.length === 0 ? (
              <div style={{ fontSize: 13, color: '#999' }}>Önce sınıf seviyelerine adet giriniz.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {activeLevels.map(level => {
                  const availableOptions = getActivityOptionsForLevel(level)
                  const selectedForLevel = getValidSelectedActivities(level)
                  const selectionGroups = getSelectionGroupsForLevel(level)
                  const totalRequiredForLevel = selectionGroups.reduce((sum, group) => sum + group.required, 0)
                  return (
                    <div key={level} style={{ border: '1px solid #ece6ff', borderRadius: 12, padding: 12, background: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.primary }}>{level}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: selectedForLevel.length === totalRequiredForLevel ? COLORS.green : COLORS.orange }}>
                          {selectedForLevel.length}/{totalRequiredForLevel} seçildi
                        </div>
                      </div>
                      {availableOptions.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#999' }}>Bu seviye için etkinlik listesi bulunamadı.</div>
                      ) : (
                        <div style={{ display: 'grid', gap: 10 }}>
                          {selectionGroups.map(group => {
                            const selectedInGroup = getSelectedActivitiesForGroup(selectedForLevel, group)
                            const limitReached = selectedInGroup.length >= group.required
                            return (
                              <div key={`${level}-${group.key}`} style={{ border: '1px solid #f0e8ff', borderRadius: 10, padding: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.primary }}>{group.label}</div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: selectedInGroup.length === group.required ? COLORS.green : COLORS.orange }}>
                                    {selectedInGroup.length}/{group.required}
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                                  {group.options.map(activityName => {
                                    const checked = selectedForLevel.includes(activityName)
                                    const disabled = !checked && limitReached
                                    return (
                                      <label key={`${level}-${group.key}-${activityName}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: checked ? '#f7f3ff' : '#fafafa', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1 }}>
                                        <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleActivity(level, activityName)} />
                                        <span style={{ fontSize: 12, color: '#333', fontWeight: 600 }}>{activityName}</span>
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {shouldShowReadOnlyProductList && (
          <div style={S.card}>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>16'lı Keşif Kutusu Ürün Listesi</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Bu pakette seçim gerekmez; aşağıdaki ürünlerin tamamı otomatik dahil edilir.</div>
            {activeLevels.length === 0 ? (
              <div style={{ fontSize: 13, color: '#999' }}>Önce sınıf seviyelerine adet giriniz.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {activeLevels.map(level => {
                  const availableOptions = getActivityOptionsForLevel(level)
                  const firstGroup = availableOptions.slice(0, 8)
                  const secondGroup = availableOptions.slice(8, 16)
                  return (
                    <div key={level} style={{ border: '1px solid #ece6ff', borderRadius: 12, padding: 12, background: '#fff' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.primary, marginBottom: 10 }}>{level}</div>
                      {availableOptions.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#999' }}>Bu seviye için etkinlik listesi bulunamadı.</div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                          <div style={{ border: '1px solid #f0e8ff', borderRadius: 10, padding: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.primary, marginBottom: 8 }}>İlk 8 Ürün</div>
                            <div style={{ display: 'grid', gap: 6 }}>
                              {firstGroup.map(activityName => (
                                <div key={`${level}-readonly-first-${activityName}`} style={{ fontSize: 12, color: '#333', fontWeight: 600, padding: '6px 8px', borderRadius: 8, background: '#fafafa' }}>{activityName}</div>
                              ))}
                            </div>
                          </div>
                          <div style={{ border: '1px solid #f0e8ff', borderRadius: 10, padding: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.primary, marginBottom: 8 }}>İkinci 8 Ürün</div>
                            <div style={{ display: 'grid', gap: 6 }}>
                              {secondGroup.map(activityName => (
                                <div key={`${level}-readonly-second-${activityName}`} style={{ fontSize: 12, color: '#333', fontWeight: 600, padding: '6px 8px', borderRadius: 8, background: '#fafafa' }}>{activityName}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
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