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
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
const toDisplayHtml = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return '-'
  return escapeHtml(text).replace(/\n/g, '<br />')
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
  const generatedAt = formatDateTime(new Date())
  const schoolName = toDisplayHtml(form?.school_name || '-')
  const taxNo = toDisplayHtml(form?.tax_no || '-')
  const taxOffice = toDisplayHtml(form?.tax_office || '-')
  const contactName = toDisplayHtml(form?.contact_name || '-')
  const contactPhone = toDisplayHtml(form?.contact_phone || '-')
  const contactEmail = toDisplayHtml(form?.contact_email || '-')
  const address = toDisplayHtml(form?.address || '-')
  const activityHtml = activityEntries.length === 0
    ? '<div class="empty">Seviye bazlı ürün seçimi bulunmuyor.</div>'
    : activityEntries.map(([level, activities]) => {
      const listText = (activities || []).length > 0
        ? activities.map(item => escapeHtml(item)).join(', ')
        : '-'
      return `<div class="activity-row"><div class="activity-level">${escapeHtml(level)}</div><div class="activity-list">${listText}</div></div>`
    }).join('')
  const classRowsHtml = (classRows || []).length === 0
    ? '<tr><td colspan="7">Sınıf satırı bulunmuyor.</td></tr>'
    : (classRows || []).map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${toDisplayHtml(row.grade || '-')}</td>
        <td>${toDisplayHtml(row.branch || '-')}</td>
        <td>${toDisplayHtml(row.teacher || '-')}</td>
        <td>${toDisplayHtml(row.teacher_email || '-')}</td>
        <td>${toDisplayHtml(row.teacher_phone || '-')}</td>
        <td>${escapeHtml(parseInt(row.qty, 10) || 0)}</td>
      </tr>
    `).join('')

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Keşif Kutusu - Okul Formu</title>
  <style>
    :root { color-scheme: light only; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f7f5fb;
      color: #1f1f1f;
      font-family: "Inter", "Segoe UI", Arial, sans-serif;
      line-height: 1.4;
      padding: 26px;
    }
    .report {
      max-width: 980px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 10px 28px rgba(53, 17, 80, 0.14);
      overflow: hidden;
      border: 1px solid #eee3ff;
    }
    .header {
      padding: 20px 24px;
      background: linear-gradient(120deg, #8c479c, #6c50be, #60cdcb);
      color: #fff;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 4px;
      letter-spacing: 0.2px;
    }
    .subtitle {
      font-size: 13px;
      opacity: 0.95;
    }
    .content {
      padding: 20px;
      display: grid;
      gap: 14px;
    }
    .section {
      border: 1px solid #ece3fa;
      border-radius: 12px;
      padding: 14px;
      background: #fff;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #8c479c;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 14px;
    }
    .info-item {
      background: #faf7ff;
      border: 1px solid #f1e9ff;
      border-radius: 10px;
      padding: 8px 10px;
    }
    .label {
      font-size: 10px;
      color: #7a6a92;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .value {
      font-size: 13px;
      color: #232323;
      font-weight: 600;
      word-break: break-word;
    }
    .activity-list-wrap { display: grid; gap: 8px; }
    .activity-row {
      display: grid;
      grid-template-columns: 170px 1fr;
      gap: 10px;
      border: 1px solid #f1e9ff;
      border-radius: 9px;
      padding: 8px 10px;
      background: #faf7ff;
    }
    .activity-level {
      font-size: 12px;
      font-weight: 800;
      color: #8c479c;
    }
    .activity-list {
      font-size: 12px;
      color: #333;
      font-weight: 600;
      word-break: break-word;
    }
    .empty {
      font-size: 12px;
      color: #777;
      border: 1px dashed #d8c8ef;
      border-radius: 9px;
      padding: 10px;
      background: #fbf9ff;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border: 1px solid #e8ddf8;
      padding: 8px 7px;
      font-size: 12px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f7f2ff;
      color: #6b2e7c;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.35px;
    }
    tbody tr:nth-child(even) td { background: #fcfbff; }
    tfoot td {
      background: #f7f2ff;
      font-weight: 800;
      color: #6b2e7c;
    }
    .summary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #f4efff;
      border: 1px solid #e7dafc;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      color: #6a3f8e;
      font-weight: 800;
      margin-top: 10px;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .report { box-shadow: none; border: none; border-radius: 0; }
    }
    @media (max-width: 760px) {
      body { padding: 10px; }
      .header { padding: 16px; }
      .content { padding: 12px; }
      .info-grid { grid-template-columns: 1fr; }
      .activity-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="report">
    <header class="header">
      <div class="title">KEŞİF KUTUSU - OKUL FORMU</div>
      <div class="subtitle">Oluşturma Tarihi: ${escapeHtml(generatedAt)}</div>
    </header>
    <section class="content">
      <div class="section">
        <div class="section-title">Kurum Bilgileri</div>
        <div class="info-grid">
          <div class="info-item"><div class="label">Kurum</div><div class="value">${schoolName}</div></div>
          <div class="info-item"><div class="label">Vergi No</div><div class="value">${taxNo}</div></div>
          <div class="info-item"><div class="label">Vergi Dairesi</div><div class="value">${taxOffice}</div></div>
          <div class="info-item"><div class="label">Yetkili</div><div class="value">${contactName}</div></div>
          <div class="info-item"><div class="label">Telefon</div><div class="value">${contactPhone}</div></div>
          <div class="info-item"><div class="label">E-posta</div><div class="value">${contactEmail}</div></div>
          <div class="info-item" style="grid-column: 1 / -1;"><div class="label">Adres</div><div class="value">${address}</div></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Seviye Bazlı Ürün Listesi</div>
        <div class="activity-list-wrap">${activityHtml}</div>
      </div>
      <div class="section">
        <div class="section-title">Sınıf Dağılımı</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
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
              <td colspan="6">TOPLAM ADET</td>
              <td>${escapeHtml(totalQty)}</td>
            </tr>
          </tfoot>
        </table>
        <div class="summary">Toplam sınıf adedi: ${escapeHtml(totalQty)}</div>
      </div>
    </section>
  </main>
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
