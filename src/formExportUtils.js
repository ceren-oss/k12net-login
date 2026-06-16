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

export const buildSchoolFormExportHtml = ({ form, classRows = [], activitiesByLevel = {} }) => {
  const activityEntries = Object.entries(activitiesByLevel || {})
  const totalQty = (classRows || []).reduce((sum, row) => sum + (parseInt(row.qty, 10) || 0), 0)
  const activityHtml = activityEntries.length === 0
    ? '<li>-</li>'
    : activityEntries.map(([level, activities]) => `<li><strong>${level}:</strong> ${(activities || []).length > 0 ? activities.join(', ') : '-'}</li>`).join('')
  const classRowsHtml = (classRows || []).length === 0
    ? '<tr><td colspan="6">-</td></tr>'
    : (classRows || []).map((row) => `
      <tr>
        <td>${row.grade || '-'}</td>
        <td>${row.branch || '-'}</td>
        <td>${row.teacher || '-'}</td>
        <td>${row.teacher_email || '-'}</td>
        <td>${row.teacher_phone || '-'}</td>
        <td>${row.qty || 0}</td>
      </tr>
    `).join('')

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Keşif Kutusu - Okul Formu</title>
  <style>
    body { font-family: Arial, sans-serif; color: #222; margin: 24px; }
    h1 { font-size: 22px; margin-bottom: 8px; color: #8C479C; }
    h2 { font-size: 15px; margin: 20px 0 8px; color: #8C479C; }
    .meta { color: #666; font-size: 13px; margin-bottom: 18px; }
    .card { border: 1px solid #eee; border-radius: 8px; padding: 14px; margin-bottom: 14px; }
    .row { margin-bottom: 6px; font-size: 14px; }
    ul { margin: 8px 0 0 18px; padding: 0; }
    li { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; text-align: left; }
    th { background: #f8f4ff; color: #8C479C; }
    tfoot td { font-weight: 700; background: #faf8ff; }
  </style>
</head>
<body>
  <h1>KEŞİF KUTUSU - OKUL FORMU</h1>
  <div class="meta">Oluşturma Tarihi: ${formatDateTime(new Date())}</div>

  <div class="card">
    <h2>Kurum Bilgileri</h2>
    <div class="row"><strong>Kurum:</strong> ${form?.school_name || '-'}</div>
    <div class="row"><strong>Vergi No:</strong> ${form?.tax_no || '-'}</div>
    <div class="row"><strong>Vergi Dairesi:</strong> ${form?.tax_office || '-'}</div>
    <div class="row"><strong>Yetkili:</strong> ${form?.contact_name || '-'}</div>
    <div class="row"><strong>Telefon:</strong> ${form?.contact_phone || '-'}</div>
    <div class="row"><strong>E-posta:</strong> ${form?.contact_email || '-'}</div>
    <div class="row"><strong>Adres:</strong> ${form?.address || '-'}</div>
  </div>

  <div class="card">
    <h2>Seviye Bazlı Ürün Listesi</h2>
    <ul>${activityHtml}</ul>
  </div>

  <div class="card">
    <h2>Sınıf Dağılımı</h2>
    <table>
      <thead>
        <tr>
          <th>Sınıf</th>
          <th>Şube</th>
          <th>Öğretmen</th>
          <th>Mail</th>
          <th>Tel</th>
          <th>Adet</th>
        </tr>
      </thead>
      <tbody>${classRowsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="5">TOPLAM ADET</td>
          <td>${totalQty}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</body>
</html>`
}

export const downloadSchoolFormReport = ({ form, classRows = [], activitiesByLevel = {}, filenamePrefix = 'okul-formu' }) => {
  const content = buildSchoolFormExportHtml({ form, classRows, activitiesByLevel })
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const baseName = sanitizeFilenamePart(form?.school_name) || sanitizeFilenamePart(filenamePrefix) || 'okul-formu'
  const datePart = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `${baseName}-${datePart}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
