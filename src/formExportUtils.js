const sanitizeFilenamePart = (value) => {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('tr-TR')
}

export const buildSchoolFormExportText = ({ form, classRows = [], activitiesByLevel = {} }) => {
  const activityEntries = Object.entries(activitiesByLevel || {})
  const totalQty = (classRows || []).reduce((sum, row) => sum + (parseInt(row.qty, 10) || 0), 0)
  const lines = [
    'KEŞİF KUTUSU - OKUL FORMU',
    `Oluşturma Tarihi: ${formatDateTime(new Date())}`,
    '',
    'KURUM BİLGİLERİ',
    `Kurum: ${form?.school_name || '-'}`,
    `Vergi No: ${form?.tax_no || '-'}`,
    `Vergi Dairesi: ${form?.tax_office || '-'}`,
    `Yetkili: ${form?.contact_name || '-'}`,
    `Telefon: ${form?.contact_phone || '-'}`,
    `E-posta: ${form?.contact_email || '-'}`,
    `Adres: ${form?.address || '-'}`,
    '',
    'SEVİYE BAZLI ÜRÜN LİSTESİ',
  ]

  if (activityEntries.length === 0) {
    lines.push('-')
  } else {
    activityEntries.forEach(([level, activities]) => {
      lines.push(`${level}: ${(activities || []).length > 0 ? activities.join(', ') : '-'}`)
    })
  }

  lines.push('', 'SINIF DAĞILIMI')
  if (!classRows || classRows.length === 0) {
    lines.push('-')
  } else {
    classRows.forEach((row, index) => {
      lines.push(
        `${index + 1}. ${row.grade || '-'} / Şube: ${row.branch || '-'} / Öğretmen: ${row.teacher || '-'} / Mail: ${row.teacher_email || '-'} / Tel: ${row.teacher_phone || '-'} / Adet: ${row.qty || 0}`
      )
    })
  }

  lines.push('', `TOPLAM ADET: ${totalQty}`)
  return lines.join('\n')
}

export const downloadSchoolFormReport = ({ form, classRows = [], activitiesByLevel = {}, filenamePrefix = 'okul-formu' }) => {
  const content = buildSchoolFormExportText({ form, classRows, activitiesByLevel })
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const baseName = sanitizeFilenamePart(form?.school_name) || sanitizeFilenamePart(filenamePrefix) || 'okul-formu'
  const datePart = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `${baseName}-${datePart}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
