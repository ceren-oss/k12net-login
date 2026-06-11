const GUIDE_CONFIG = {
  admin: {
    badge: 'ADMIN',
    title: 'Admin Hızlı Kullanım Kılavuzu',
    subtitle: 'Operasyonu tek ekrandan yönetmek için kısa akış',
    accent: '#8C479C',
    capabilities: ['Bayi + fiyat yönetimi', 'Ön sipariş → sipariş dönüşümü', 'Sipariş / sevk / fatura takibi', 'Ödeme, çek ve audit denetimi'],
    steps: [
      { icon: '📊', title: 'Dashboard Kontrolü', desc: 'Ciro, çek, bakiye ve bekleyen işleri gör' },
      { icon: '🏪', title: 'Bayi & Fiyat Yönetimi', desc: 'Bayi hesabı ve fiyat listesi güncelle' },
      { icon: '📋', title: 'Ön Sipariş İşlemleri', desc: 'Detayı incele, siparişe dönüştür' },
      { icon: '📦', title: 'Sipariş Operasyonu', desc: 'Sevk, fatura, DIA ve sınıf dağılımını yönet' },
      { icon: '🕵️', title: 'Denetim', desc: 'İşlem kayıtlarından kim ne yaptı kontrol et' },
    ],
    tips: [
      'Kritik işlem sonrası İşlem Kayıtları ekranını kontrol et.',
      'Büyük bakiye farklarında ödeme ve çek hareketlerini karşılaştır.',
      'Ön siparişi siparişe dönüştürmeden okul formunu mutlaka doğrula.',
    ],
  },
  dealer: {
    badge: 'BAYİ',
    title: 'Bayi Hızlı Kullanım Kılavuzu',
    subtitle: 'Sipariş ve okul form akışı için kısa yol haritası',
    accent: '#4F66D6',
    capabilities: ['Ön sipariş oluşturma', 'Okul form linki paylaşımı', 'Form onay ve sipariş takibi', 'Ödeme / çek ve bakiye yönetimi'],
    steps: [
      { icon: '📝', title: 'Ön Sipariş Gir', desc: 'Okul ve ürün adetlerini oluştur' },
      { icon: '🔗', title: 'Form Linki Paylaş', desc: 'Okulun seviye bazlı seçimi tamamlamasını sağla' },
      { icon: '✅', title: 'Formu Kontrol Et', desc: 'Gelen formu inceleyip onay sürecini başlat' },
      { icon: '📦', title: 'Sipariş Takibi', desc: 'Sipariş, sevk ve fatura durumunu izle' },
      { icon: '💰', title: 'Finans Takibi', desc: 'Ödeme/çek hareketleri ve bakiyeyi takip et' },
    ],
    tips: [
      'Form linkini paylaşmadan önce okul ve sezon bilgisini kontrol et.',
      'Sipariş durum değişimlerini günlük takip ederek müşteriyi bilgilendir.',
      'Bakiye dengesini korumak için ödeme ve çek kayıtlarını düzenli izle.',
    ],
  },
}

const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10,8,34,0.62)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1400,
    padding: 18,
  },
  box: {
    width: 'min(980px, 96vw)',
    maxHeight: '90vh',
    overflowY: 'auto',
    borderRadius: 20,
    background: '#fff',
    boxShadow: '0 24px 70px rgba(15,10,51,0.35)',
    border: '1px solid #ece8ff',
    padding: 22,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 14,
  },
  title: { margin: 0, fontSize: 23, fontWeight: 800, color: '#2f2758' },
  subtitle: { margin: '4px 0 0', fontSize: 13, color: '#6b6890' },
  badge: {
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  closeBtn: {
    border: 'none',
    background: '#f2efff',
    color: '#4f457f',
    width: 34,
    height: 34,
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 18,
    fontWeight: 700,
    lineHeight: '34px',
    textAlign: 'center',
  },
  sectionTitle: {
    margin: '14px 0 10px',
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.7px',
    color: '#6b6890',
  },
  capabilityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 10,
  },
  capabilityCard: {
    background: '#f8f5ff',
    border: '1px solid #ebe5ff',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#4f457f',
  },
  flowWrap: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 8,
    flexWrap: 'wrap',
  },
  stepCard: {
    flex: '1 1 150px',
    minWidth: 140,
    borderRadius: 14,
    border: '1px solid',
    background: '#fff',
    padding: 11,
  },
  stepIcon: { fontSize: 22, marginBottom: 6 },
  stepTitle: { margin: 0, fontSize: 13, fontWeight: 800, color: '#2f2758' },
  stepDesc: { margin: '5px 0 0', fontSize: 11, color: '#6e6a94', lineHeight: 1.35 },
  arrow: {
    alignSelf: 'center',
    fontSize: 20,
    color: '#948bc4',
    fontWeight: 800,
    padding: '0 2px',
  },
  tips: {
    margin: 0,
    paddingLeft: 18,
    display: 'grid',
    gap: 6,
    fontSize: 12,
    color: '#4e4a67',
    lineHeight: 1.4,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  doneBtn: {
    border: 'none',
    borderRadius: 10,
    padding: '10px 16px',
    cursor: 'pointer',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
  },
}

export default function RoleGuideModal({ role = 'dealer', open, onClose }) {
  if (!open) return null
  const config = GUIDE_CONFIG[role] || GUIDE_CONFIG.dealer
  const accentSoft = config.accent + '22'

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.box} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <div>
            <span style={{ ...S.badge, color: config.accent, background: accentSoft }}>{config.badge}</span>
            <h2 style={S.title}>{config.title}</h2>
            <p style={S.subtitle}>{config.subtitle}</p>
          </div>
          <button style={S.closeBtn} onClick={onClose} aria-label="Kapat">×</button>
        </div>

        <div style={S.sectionTitle}>Yapılabilirlikler</div>
        <div style={S.capabilityGrid}>
          {config.capabilities.map((item) => (
            <div key={item} style={{ ...S.capabilityCard, borderColor: config.accent + '35', background: accentSoft }}>
              {item}
            </div>
          ))}
        </div>

        <div style={S.sectionTitle}>Akış Diyagramı (Hızlı)</div>
        <div style={S.flowWrap}>
          {config.steps.map((step, idx) => (
            <div key={step.title} style={{ display: 'flex', alignItems: 'stretch', flex: '1 1 220px', minWidth: 190 }}>
              <div style={{ ...S.stepCard, borderColor: config.accent + '55' }}>
                <div style={S.stepIcon}>{step.icon}</div>
                <h4 style={S.stepTitle}>{idx + 1}. {step.title}</h4>
                <p style={S.stepDesc}>{step.desc}</p>
              </div>
              {idx < config.steps.length - 1 && <div style={S.arrow}>→</div>}
            </div>
          ))}
        </div>

        <div style={S.sectionTitle}>Kritik İpuçları</div>
        <ul style={S.tips}>
          {config.tips.map((tip) => <li key={tip}>{tip}</li>)}
        </ul>

        <div style={S.footer}>
          <button style={{ ...S.doneBtn, background: config.accent }} onClick={onClose}>Anladım, Devam Et</button>
        </div>
      </div>
    </div>
  )
}
