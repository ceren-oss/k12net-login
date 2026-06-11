import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import loginBg from './assets/login-bg.png'
import kesifKutusuLogo from './assets/kesif-kutusu-logo.png'
import RoleGuideModal from './RoleGuideModal'
import { hashDealerPassword, isHashedPassword, normalizeUsername } from './securityUtils'
import useIsMobile from './useIsMobile'

const COLORS = {
  primary: '#8C479C', yellow: '#FCC400', teal: '#60CDCB',
  green: '#86B535', orange: '#EC6A34', pink: '#D7508B', bg: '#f8f4ff',
}

const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('tr-TR') : '-'

const GRADES = ['4 Yaş', '5-6 Yaş', '1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf', '5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf']

const S = {
  sidebar: { width: 220, minHeight: '100vh', background: COLORS.primary, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 100 },
  main: { marginLeft: 220, minHeight: '100vh', background: COLORS.bg, padding: 28, position: 'relative', overflow: 'hidden' },
  navItem: (active, mobile = false) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: mobile ? '10px 14px' : '12px 20px',
    cursor: 'pointer',
    background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
    color: '#fff',
    fontSize: 14,
    fontWeight: active ? 700 : 400,
    borderLeft: mobile ? 'none' : (active ? '4px solid #FCC400' : '4px solid transparent'),
    borderBottom: mobile ? (active ? '3px solid #FCC400' : '3px solid transparent') : 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }),
  card: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(140,71,156,0.08)', overflowX: 'auto' },
  btn: (color) => ({ padding: '9px 18px', borderRadius: 9, background: color || COLORS.primary, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }),
  input: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '2px solid #f0e8ff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '2px solid #f0e8ff', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' },
  label: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', padding: '10px 12px', borderBottom: '2px solid #f0e8ff' },
  td: { padding: '11px 12px', fontSize: 13, color: '#333', borderBottom: '1px solid #f9f0ff' },
  badge: (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + '22', color: color }),
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modalBox: { background: '#fff', borderRadius: 16, padding: 28, width: 580, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 },
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

const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'dealers', icon: '🏪', label: 'Bayiler' },
  { id: 'preorders', icon: '📋', label: 'Ön Siparişler' },
  { id: 'orders', icon: '📦', label: 'Siparişler' },
  { id: 'payments', icon: '💰', label: 'Ödemeler' },
  { id: 'checks', icon: '🏦', label: 'Çekler' },
  { id: 'products', icon: 'logo', label: 'Ürünler' },
  { id: 'team', icon: '👥', label: 'Admin Ekibi' },
  { id: 'audit', icon: '🕵️', label: 'İşlem Kayıtları' },
]

const DEALER_FIELDS = [['name','Firma Adı'],['city','Şehir'],['contact','Yetkili'],['phone','Telefon'],['email','E-posta'],['tax_no','Vergi No'],['tax_office','Vergi Dairesi'],['username','Kullanıcı Adı'],['password_hash','Şifre'],['credit_limit','Kredi Limiti']]

function DealerFormModal({ title, form, setForm, onClose, onSave, showPasswordField = true }) {
  const fields = showPasswordField ? DEALER_FIELDS : DEALER_FIELDS.filter(([key]) => key !== 'password_hash')
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <h3 style={{ color: COLORS.primary, marginBottom: 20 }}>{title}</h3>
        <div style={S.grid2}>{fields.map(([k,l]) => (<div key={k}><label style={S.label}>{l}</label><input type={k === 'password_hash' ? 'password' : 'text'} style={S.input} value={form[k] || ''} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} placeholder={k === 'password_hash' ? 'Şifre giriniz' : ''} /></div>))}</div>
        <div style={{ marginTop: 14 }}><label style={S.label}>Adres</label><input style={S.input} value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button style={S.btn('#aaa')} onClick={onClose}>İptal</button>
          <button style={S.btn()} onClick={onSave}>Kaydet</button>
        </div>
      </div>
    </div>
  )
}

function AuditLogs({ auditLogs, loadAuditLogs, auditLoading, isMobile }) {
  const formatDetails = (details) => {
    if (!details) return '-'
    const text = typeof details === 'string' ? details : JSON.stringify(details)
    return text.length > 160 ? text.slice(0, 157) + '...' : text
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <h2 style={{ color: COLORS.primary }}>İşlem Kayıtları</h2>
        <button style={S.btn(COLORS.teal)} onClick={() => loadAuditLogs(100)}>{auditLoading ? 'Yenileniyor...' : 'Yenile'}</button>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead><tr><th style={S.th}>Tarih</th><th style={S.th}>Yapan</th><th style={S.th}>İşlem</th><th style={S.th}>Hedef</th><th style={S.th}>Detay</th></tr></thead>
          <tbody>{(auditLogs || []).length === 0 ? (
            <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#888', padding: 24 }}>Kayıt bulunamadı</td></tr>
          ) : (auditLogs || []).map((log, idx) => (
            <tr key={log.id || `${log.created_at || ''}-${idx}`}>
              <td style={S.td}>{fmtDateTime(log.created_at)}</td>
              <td style={S.td}>{log.admin_name || log.admin_username || '-'}</td>
              <td style={S.td}><span style={S.badge(COLORS.primary)}>{log.action || '-'}</span></td>
              <td style={S.td}>{log.target || '-'}</td>
              <td style={{ ...S.td, maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatDetails(log.details)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function AdminTeam({ adminUser, isMobile }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingUsername, setEditingUsername] = useState('')
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '', is_superuser: false, is_active: true })

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Admin ekibi yüklenemedi.')
      setUsers(Array.isArray(payload.users) ? payload.users : [])
    } catch (e) {
      setError(e.message || 'Admin ekibi yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers().catch(() => {}) }, [])

  const openNew = () => {
    setEditingUsername('')
    setForm({ username: '', name: '', email: '', password: '', is_superuser: false, is_active: true })
    setFormError('')
    setModal(true)
  }

  const openEdit = (user) => {
    setEditingUsername(user.username)
    setForm({
      username: user.username,
      name: user.name || user.username,
      email: user.email || '',
      password: '',
      is_superuser: Boolean(user.is_superuser),
      is_active: user.is_active !== false,
    })
    setFormError('')
    setModal(true)
  }

  const saveUser = async () => {
    const username = normalizeUsername(editingUsername || form.username)
    const name = String(form.name || '').trim()
    if (!username) { setFormError('Kullanıcı adı zorunludur.'); return }
    if (!name) { setFormError('Ad soyad zorunludur.'); return }
    if (!editingUsername && !String(form.password || '').trim()) { setFormError('Şifre zorunludur.'); return }

    const isPrimaryAdmin = username === 'admin'
    const body = {
      username,
      name,
      email: String(form.email || '').trim().toLowerCase(),
      is_superuser: isPrimaryAdmin ? true : Boolean(form.is_superuser),
      is_active: isPrimaryAdmin ? true : Boolean(form.is_active),
    }
    if (String(form.password || '').trim()) body.password = form.password

    setSaving(true)
    setFormError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: editingUsername ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Kullanıcı kaydedilemedi.')
      setUsers(Array.isArray(payload.users) ? payload.users : [])
      setModal(false)
    } catch (e) {
      setFormError(e.message || 'Kullanıcı kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user) => {
    const username = normalizeUsername(user.username)
    if (username === 'admin') return
    const nextActive = !(user.is_active !== false)
    if (!window.confirm(`${user.username} kullanıcısı ${nextActive ? 'aktif' : 'pasif'} yapılsın mı?`)) return
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, is_active: nextActive }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Durum güncellenemedi.')
      setUsers(Array.isArray(payload.users) ? payload.users : [])
    } catch (e) {
      setError(e.message || 'Durum güncellenemedi.')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <h2 style={{ color: COLORS.primary }}>Admin Ekibi</h2>
        <button style={S.btn()} onClick={openNew}>+ Ekip Üyesi Ekle</button>
      </div>
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#666' }}>
          Superuser: <strong>{adminUser?.name || adminUser?.username || 'admin'}</strong> — bu alandan ekip kullanıcılarını tanımlayabilir, yetki/durum güncelleyebilirsin.
        </div>
      </div>
      <div style={S.card}>
        {error && <div style={{ background: '#fff5f5', color: '#d54545', border: '1px solid #ffd6d6', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>{error}</div>}
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr><th style={S.th}>Kullanıcı</th><th style={S.th}>Ad Soyad</th><th style={S.th}>E-posta</th><th style={S.th}>Rol</th><th style={S.th}>Durum</th><th style={S.th}></th></tr></thead>
          <tbody>{loading ? (
            <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#888', padding: 22 }}>Yükleniyor...</td></tr>
          ) : users.length === 0 ? (
            <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#888', padding: 22 }}>Kayıtlı admin kullanıcı bulunamadı.</td></tr>
          ) : users.map(user => (
            <tr key={user.username}>
              <td style={S.td}><strong>{user.username}</strong></td>
              <td style={S.td}>{user.name || '-'}</td>
              <td style={S.td}>{user.email || '-'}</td>
              <td style={S.td}><span style={S.badge(user.is_superuser ? COLORS.primary : COLORS.teal)}>{user.is_superuser ? 'Superuser' : 'Admin'}</span></td>
              <td style={S.td}><span style={S.badge(user.is_active !== false ? COLORS.green : '#999')}>{user.is_active !== false ? 'Aktif' : 'Pasif'}</span></td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={{ ...S.btn(COLORS.teal), fontSize: 11, padding: '5px 10px' }} onClick={() => openEdit(user)}>Düzenle</button>
                  {normalizeUsername(user.username) !== 'admin' && (
                    <button style={{ ...S.btn(user.is_active !== false ? '#ef4444' : COLORS.green), fontSize: 11, padding: '5px 10px' }} onClick={() => toggleActive(user)}>
                      {user.is_active !== false ? 'Pasif Yap' : 'Aktif Yap'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {modal && (
        <div style={S.modal} onClick={() => setModal(false)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 580, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 20 }}>{editingUsername ? `Admin Düzenle: ${editingUsername}` : 'Yeni Admin Üyesi'}</h3>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>Kullanıcı Adı</label>
                <input
                  style={S.input}
                  value={form.username}
                  disabled={Boolean(editingUsername)}
                  onChange={e => setForm(prev => ({ ...prev, username: normalizeUsername(e.target.value) }))}
                  placeholder="ornek.admin"
                />
              </div>
              <div>
                <label style={S.label}>Ad Soyad</label>
                <input style={S.input} value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ad Soyad" />
              </div>
              <div>
                <label style={S.label}>E-posta (reset için)</label>
                <input type="email" style={S.input} value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="ornek@domain.com" />
              </div>
              <div>
                <label style={S.label}>{editingUsername ? 'Yeni Şifre (opsiyonel)' : 'Şifre'}</label>
                <input type="password" style={S.input} value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} placeholder="••••••••" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                <input
                  type="checkbox"
                  id="admin_superuser_flag"
                  checked={normalizeUsername(form.username) === 'admin' ? true : form.is_superuser}
                  disabled={normalizeUsername(form.username) === 'admin'}
                  onChange={e => setForm(prev => ({ ...prev, is_superuser: e.target.checked }))}
                />
                <label htmlFor="admin_superuser_flag" style={{ fontSize: 13, fontWeight: 600 }}>Superuser yetkisi ver</label>
              </div>
            </div>
            {formError && <div style={{ marginTop: 12, background: '#fff5f5', color: '#d54545', border: '1px solid #ffd6d6', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>{formError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: isMobile ? 'flex-start' : 'flex-end', marginTop: 20, flexDirection: isMobile ? 'column' : 'row' }}>
              <button style={S.btn('#aaa')} onClick={() => setModal(false)}>İptal</button>
              <button style={S.btn()} onClick={saveUser} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default function AdminPanel({ adminUser, onLogout }) {
  const [page, setPage] = useState('dashboard')
  const [showGuide, setShowGuide] = useState(true)
  const [dealers, setDealers] = useState([])
  const [orders, setOrders] = useState([])
  const [preOrders, setPreOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [checks, setChecks] = useState([])
  const [products, setProducts] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [passwordModal, setPasswordModal] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', new_password_again: '' })
  const isSuperUser = Boolean(adminUser?.is_superuser)
  const isMobile = useIsMobile(960)

  useEffect(() => { loadAll() }, [isSuperUser])
  useEffect(() => {
    if (!isSuperUser && (page === 'audit' || page === 'team')) {
      setPage('dashboard')
    }
  }, [isSuperUser, page])

  const loadAuditLogs = async (limit = 25) => {
    if (!isSuperUser) {
      setAuditLogs([])
      setAuditLoading(false)
      return
    }
    setAuditLoading(true)
    try {
      const res = await fetch(`/api/admin/audit?limit=${encodeURIComponent(limit)}`, { credentials: 'include' })
      const payload = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(payload.logs)) setAuditLogs(payload.logs)
    } finally {
      setAuditLoading(false)
    }
  }

  const logAdminAction = async (action, target, details = {}) => {
    try {
      await fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, target, details }),
      })
    } catch {}
  }

  const loadAll = async () => {
    const [d, o, po, p, c, pr] = await Promise.all([
      supabase.from('dealers').select('id, name, city, contact, phone, email, tax_no, tax_office, address, username, credit_limit, balance, created_at').not('username', 'like', '__admin__%').order('name'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('pre_orders').select('*, pre_order_items(*)').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('checks').select('*').order('due_date'),
      supabase.from('products').select('*').order('id'),
    ])
    if (d.data) setDealers(d.data)
    if (o.data) setOrders(o.data)
    if (po.data) setPreOrders(po.data)
    if (p.data) setPayments(p.data)
    if (c.data) setChecks(c.data)
    if (pr.data) setProducts(pr.data)
    if (isSuperUser) {
      loadAuditLogs().catch(() => {})
    } else {
      setAuditLogs([])
    }
  }

  const getDealerName = (id) => dealers.find(d => d.id === id)?.name || '-'
  const visibleNav = isSuperUser ? NAV : NAV.filter(n => n.id !== 'audit' && n.id !== 'team')
  const props = { dealers, orders, preOrders, payments, checks, products, loadAll, getDealerName, adminUser, logAdminAction, auditLogs, loadAuditLogs, auditLoading, isSuperUser, isMobile }
  const openPasswordModal = () => {
    setPasswordError('')
    setPasswordForm({ current_password: '', new_password: '', new_password_again: '' })
    setPasswordModal(true)
  }

  const saveOwnPassword = async () => {
    const currentPassword = String(passwordForm.current_password || '')
    const newPassword = String(passwordForm.new_password || '')
    const newPasswordAgain = String(passwordForm.new_password_again || '')
    if (!currentPassword || !newPassword || !newPasswordAgain) {
      setPasswordError('Tüm alanlar zorunludur.')
      return
    }
    if (newPassword !== newPasswordAgain) {
      setPasswordError('Yeni şifre ve tekrar alanı aynı olmalıdır.')
      return
    }
    setPasswordSaving(true)
    setPasswordError('')
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Şifre güncellenemedi.')
      setPasswordModal(false)
      alert('Şifren başarıyla güncellendi.')
    } catch (e) {
      setPasswordError(e.message || 'Şifre güncellenemedi.')
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <button style={{ ...S.guideFab, top: isMobile ? 'auto' : 14, bottom: isMobile ? 14 : 'auto' }} onClick={() => setShowGuide(true)} title="Portal Kullanım Kılavuzu" aria-label="Portal Kullanım Kılavuzu">
        🧭
      </button>
      <div style={isMobile ? { ...S.sidebar, width: '100%', minHeight: 'auto', position: 'relative', top: 'auto', left: 'auto', zIndex: 10 } : S.sidebar}>
        <div style={{ padding: isMobile ? '14px 12px' : '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.15)', textAlign: 'center' }}>
          <img src={kesifKutusuLogo} alt="Keşif Kutusu" style={{ width: '100%', maxWidth: 176, height: 'auto' }} />
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.7px', fontWeight: 700 }}>Admin Paneli</div>
        </div>
        <div style={isMobile ? { display: 'flex', overflowX: 'auto', gap: 4, padding: '4px 6px' } : { flex: 1, paddingTop: 8 }}>
          {visibleNav.map(n => (
            <div key={n.id} style={S.navItem(page === n.id, isMobile)} onClick={() => setPage(n.id)}>
              <span>
                {n.icon === 'logo'
                  ? <img src={kesifKutusuLogo} alt="Keşif Kutusu" style={{ width: 20, height: 20, objectFit: 'contain', display: 'block' }} />
                  : n.icon}
              </span>
              <span>{n.label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: isMobile ? '10px 12px' : '12px 16px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>Aktif Admin</div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginTop: 2 }}>{adminUser?.name || adminUser?.username || 'Admin'}</div>
          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 2 }}>@{adminUser?.username || 'admin'}</div>
        </div>
        <div style={{ padding: isMobile ? '12px' : 20, display: 'flex', gap: 8, flexDirection: isMobile ? 'row' : 'column' }}>
          <button onClick={openPasswordModal} style={{ ...S.btn('rgba(255,255,255,0.2)'), width: '100%', fontSize: 12 }}>Şifremi Değiştir</button>
          <button onClick={onLogout} style={{ ...S.btn('rgba(255,255,255,0.2)'), width: '100%', fontSize: 12, marginTop: isMobile ? 0 : 8 }}>Çıkış Yap</button>
        </div>
      </div>
      <div style={isMobile ? { ...S.main, marginLeft: 0, padding: '14px 12px' } : S.main}>
        <div className="portal-main-bg" style={{ backgroundImage: `url(${loginBg})`, opacity: 0.38 }} />
        <div className="portal-main-overlay" />
        <div className="portal-main-content">
          {page === 'dashboard' && <Dashboard {...props} />}
          {page === 'dealers' && <Dealers {...props} />}
          {page === 'preorders' && <PreOrders {...props} />}
          {page === 'orders' && <Orders {...props} />}
          {page === 'payments' && <Payments {...props} />}
          {page === 'checks' && <Checks {...props} />}
          {page === 'products' && <Products {...props} />}
          {isSuperUser && page === 'team' && <AdminTeam {...props} />}
          {isSuperUser && page === 'audit' && <AuditLogs {...props} />}
        </div>
      </div>
      {passwordModal && (
        <div style={S.modal} onClick={() => setPasswordModal(false)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 460, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 4 }}>Şifremi Değiştir</h3>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>@{adminUser?.username || 'admin'}</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={S.label}>Mevcut Şifre</label>
                <input type="password" style={S.input} value={passwordForm.current_password} onChange={e => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Yeni Şifre</label>
                <input type="password" style={S.input} value={passwordForm.new_password} onChange={e => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Yeni Şifre (Tekrar)</label>
                <input type="password" style={S.input} value={passwordForm.new_password_again} onChange={e => setPasswordForm(prev => ({ ...prev, new_password_again: e.target.value }))} />
              </div>
            </div>
            {passwordError && <div style={{ marginTop: 12, background: '#fff5f5', color: '#d54545', border: '1px solid #ffd6d6', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>{passwordError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: isMobile ? 'flex-start' : 'flex-end', marginTop: 20, flexDirection: isMobile ? 'column' : 'row' }}>
              <button style={S.btn('#aaa')} onClick={() => setPasswordModal(false)}>İptal</button>
              <button style={S.btn()} onClick={saveOwnPassword} disabled={passwordSaving}>{passwordSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}
      <RoleGuideModal role="admin" open={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  )
}

function Dashboard({ dealers, orders, payments, checks, preOrders, auditLogs, isSuperUser, isMobile }) {
  const totalOrders = orders.reduce((s, o) => s + (o.total || 0), 0)
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const pendingChecks = checks.filter(c => c.status !== 'tahsil_edildi').reduce((s, c) => s + (c.amount || 0), 0)
  const debtDealers = dealers.filter(d => (d.balance || 0) < 0).length
  const pendingPreOrders = preOrders.filter(p => p.status === 'on_siparis' || p.status === 'kesinlesti').length

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: isMobile ? 18 : 24 }}>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Toplam Ciro', value: fmt(totalOrders), color: COLORS.primary, icon: '📦' },
          { label: 'Tahsilat', value: fmt(totalPayments), color: COLORS.green, icon: '💰' },
          { label: 'Bekleyen Çek', value: fmt(pendingChecks), color: COLORS.orange, icon: '🏦' },
          { label: 'Borçlu Bayi', value: debtDealers, color: COLORS.pink, icon: '🏪' },
          { label: 'Ön Sipariş', value: pendingPreOrders, color: COLORS.yellow, icon: '📋' },
        ].map(s => (
          <div key={s.label} style={{ ...S.card, borderTop: '4px solid ' + s.color }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
        <div style={S.card}>
          <h3 style={{ color: COLORS.primary, marginBottom: 16, fontSize: 15 }}>Son Siparişler</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
            <thead><tr><th style={S.th}>Bayi</th><th style={S.th}>Okul</th><th style={S.th}>Tutar</th></tr></thead>
            <tbody>{orders.slice(0, 5).map(o => (
              <tr key={o.id}>
                <td style={S.td}>{dealers.find(d => d.id === o.dealer_id)?.name || '-'}</td>
                <td style={S.td}>{o.school_name || '-'}</td>
                <td style={S.td}><strong>{fmt(o.total)}</strong></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={S.card}>
          <h3 style={{ color: COLORS.primary, marginBottom: 16, fontSize: 15 }}>Bayi Bakiyeleri</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
            <thead><tr><th style={S.th}>Bayi</th><th style={S.th}>Bakiye</th></tr></thead>
            <tbody>{dealers.map(d => (
              <tr key={d.id}>
                <td style={S.td}>{d.name}</td>
                <td style={S.td}><span style={{ fontWeight: 700, color: (d.balance || 0) < 0 ? COLORS.orange : COLORS.green }}>{fmt(d.balance)}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      {isSuperUser && (
        <div style={{ ...S.card, marginTop: 16 }}>
          <h3 style={{ color: COLORS.primary, marginBottom: 16, fontSize: 15 }}>Son Admin İşlemleri</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead><tr><th style={S.th}>Tarih</th><th style={S.th}>Yapan</th><th style={S.th}>İşlem</th><th style={S.th}>Hedef</th></tr></thead>
            <tbody>{(auditLogs || []).slice(0, 6).map((log, idx) => (
              <tr key={log.id || `${log.created_at || ''}-${idx}`}>
                <td style={S.td}>{fmtDate(log.created_at)}</td>
                <td style={S.td}>{log.admin_name || log.admin_username || '-'}</td>
                <td style={S.td}>{log.action || '-'}</td>
                <td style={S.td}>{log.target || '-'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Dealers({ dealers, products, loadAll, logAdminAction, isSuperUser, isMobile }) {
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [priceModal, setPriceModal] = useState(false)
  const [selectedDealer, setSelectedDealer] = useState(null)
  const [form, setForm] = useState({ name: '', city: '', contact: '', phone: '', email: '', tax_no: '', tax_office: '', address: '', username: '', password_hash: '', credit_limit: 0 })
  const [prices, setPrices] = useState({})

  const openEdit = (dealer) => { setSelectedDealer(dealer); setForm({ ...dealer, username: normalizeUsername(dealer.username), password_hash: '' }); setEditModal(true) }

  const openPrices = async (dealer) => {
    setSelectedDealer(dealer)
    const { data } = await supabase.from('dealer_prices').select('*').eq('dealer_id', dealer.id)
    const priceMap = {}
    products.forEach(p => { priceMap[p.id] = p.default_price || '' })
    if (data) data.forEach(p => { priceMap[p.product_id] = p.price })
    setPrices(priceMap)
    setPriceModal(true)
  }

  const deleteDealer = async (dealer) => {
    if (!window.confirm(dealer.name + ' silinsin mi?')) return
    await supabase.from('dealer_prices').delete().eq('dealer_id', dealer.id)
    await supabase.from('dealers').delete().eq('id', dealer.id)
    await logAdminAction('dealer_deleted', `dealer:${dealer.id}`, {
      dealer_name: dealer.name,
      dealer_username: dealer.username,
    })
    loadAll()
  }

  const saveEdit = async () => {
    const username = normalizeUsername(form.username || selectedDealer.username)
    const payload = { ...form, username, credit_limit: parseInt(form.credit_limit) || 0 }
    if (!isSuperUser) {
      delete payload.password_hash
    } else if (!form.password_hash) {
      delete payload.password_hash
    } else if (!isHashedPassword(form.password_hash)) {
      payload.password_hash = await hashDealerPassword(username, form.password_hash)
    }
    await supabase.from('dealers').update(payload).eq('id', selectedDealer.id)
    await logAdminAction('dealer_updated', `dealer:${selectedDealer.id}`, {
      dealer_name: selectedDealer.name,
      username,
    })
    setEditModal(false); loadAll()
  }

  const savePrices = async () => {
    let updatedCount = 0
    for (const [productId, price] of Object.entries(prices)) {
      if (!price) continue
      const { data: existing } = await supabase.from('dealer_prices').select('id').eq('dealer_id', selectedDealer.id).eq('product_id', parseInt(productId)).single()
      if (existing) {
        await supabase.from('dealer_prices').update({ price: parseFloat(price) }).eq('id', existing.id)
      } else {
        await supabase.from('dealer_prices').insert([{ dealer_id: selectedDealer.id, product_id: parseInt(productId), price: parseFloat(price), season: '2026-2027' }])
      }
      updatedCount += 1
    }
    await logAdminAction('dealer_prices_updated', `dealer:${selectedDealer.id}`, {
      dealer_name: selectedDealer.name,
      updated_count: updatedCount,
    })
    setPriceModal(false); loadAll()
  }

  const save = async () => {
    if (!form.name) return
    const username = normalizeUsername(form.username)
    if (!username) { alert('Kullanıcı adı zorunludur!'); return }
    const insertPayload = { ...form, username, balance: 0, credit_limit: parseInt(form.credit_limit) || 0 }
    if (isSuperUser) {
      if (!form.password_hash) { alert('Şifre zorunludur!'); return }
      insertPayload.password_hash = isHashedPassword(form.password_hash) ? form.password_hash : await hashDealerPassword(username, form.password_hash)
    } else {
      delete insertPayload.password_hash
    }
    const { data: insertedDealer } = await supabase.from('dealers').insert([insertPayload]).select('id, name, username').single()
    await logAdminAction('dealer_created', `dealer:${insertedDealer?.id || 'new'}`, {
      dealer_name: insertedDealer?.name || form.name,
      dealer_username: insertedDealer?.username || username,
    })
    setModal(false)
    setForm({ name: '', city: '', contact: '', phone: '', email: '', tax_no: '', tax_office: '', address: '', username: '', password_hash: '', credit_limit: 0 })
    loadAll()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <h2 style={{ color: COLORS.primary }}>Bayiler</h2>
        <button style={S.btn()} onClick={() => { setForm({ name: '', city: '', contact: '', phone: '', email: '', tax_no: '', tax_office: '', address: '', username: '', password_hash: '', credit_limit: 0 }); setModal(true) }}>+ Bayi Ekle</button>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr><th style={S.th}>Bayi</th><th style={S.th}>Şehir</th><th style={S.th}>Yetkili</th><th style={S.th}>Kullanıcı</th><th style={S.th}>Bakiye</th><th style={S.th}></th></tr></thead>
          <tbody>{dealers.map(dealer => (
            <tr key={dealer.id}>
              <td style={S.td}><strong>{dealer.name}</strong><br /><span style={{ fontSize: 11, color: '#888' }}>{dealer.email}</span></td>
              <td style={S.td}>{dealer.city}</td>
              <td style={S.td}>{dealer.contact}</td>
              <td style={S.td}><span style={S.badge(COLORS.teal)}>{dealer.username}</span></td>
              <td style={S.td}><span style={{ fontWeight: 700, color: (dealer.balance || 0) < 0 ? COLORS.orange : COLORS.green }}>{fmt(dealer.balance)}</span></td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={{ ...S.btn(COLORS.teal), fontSize: 11, padding: '5px 10px' }} onClick={() => openEdit(dealer)}>Düzenle</button>
                  <button style={{ ...S.btn(COLORS.green), fontSize: 11, padding: '5px 10px' }} onClick={() => openPrices(dealer)}>Fiyatlar</button>
                  <button style={{ ...S.btn('#ef4444'), fontSize: 11, padding: '5px 10px' }} onClick={() => deleteDealer(dealer)}>Sil</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {modal && <DealerFormModal title="Yeni Bayi" form={form} setForm={setForm} onClose={() => setModal(false)} onSave={save} showPasswordField={isSuperUser} />}
      {editModal && selectedDealer && <DealerFormModal title={'Düzenle: ' + selectedDealer.name} form={form} setForm={setForm} onClose={() => setEditModal(false)} onSave={saveEdit} showPasswordField={isSuperUser} />}

      {priceModal && selectedDealer && (
        <div style={S.modal} onClick={() => setPriceModal(false)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 580, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 4 }}>Fiyat Listesi</h3>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>{selectedDealer.name}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead><tr><th style={S.th}>Ürün</th><th style={S.th}>Varsayılan</th><th style={S.th}>Bayi Fiyatı</th></tr></thead>
              <tbody>{products.map(p => (
                <tr key={p.id}>
                  <td style={S.td}><strong>{p.name}</strong></td>
                  <td style={S.td}>{fmt(p.default_price)}</td>
                  <td style={S.td}><input type="number" style={{ ...S.input, width: 130 }} value={prices[p.id] || ''} onChange={e => setPrices(prev => ({ ...prev, [p.id]: e.target.value }))} placeholder={p.default_price} /></td>
                </tr>
              ))}</tbody>
            </table>
            <div style={{ display: 'flex', gap: 10, justifyContent: isMobile ? 'flex-start' : 'flex-end', marginTop: 20, flexDirection: isMobile ? 'column' : 'row' }}>
              <button style={S.btn('#aaa')} onClick={() => setPriceModal(false)}>İptal</button>
              <button style={S.btn(COLORS.green)} onClick={savePrices}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreOrders({ preOrders, dealers, products, loadAll, getDealerName, logAdminAction, isMobile }) {
  const [detail, setDetail] = useState(null)

  const convertToOrder = async (po) => {
    const items = po.pre_order_items || []
    const total = items.reduce((s, i) => s + ((i.qty || 0) * (i.unit_price || 0)), 0)
    const orderId = 'SIP-' + Date.now().toString().slice(-6)
    await supabase.from('orders').insert([{ id: orderId, dealer_id: po.dealer_id, school_name: po.school_name, season: po.season, total, invoice_status: 'kesilmedi', dia_status: false, cargo_status: 'faturalanmadi', note: po.note, status: 'beklemede' }])
    for (const item of items) {
      await supabase.from('order_items').insert([{ order_id: orderId, product_id: item.product_id, qty: item.qty, unit_price: item.unit_price, free_qty: 0 }])
    }
    const dealer = dealers.find(d => d.id === po.dealer_id)
    await supabase.from('dealers').update({ balance: (dealer?.balance || 0) - total }).eq('id', po.dealer_id)
    await supabase.from('pre_orders').update({ status: 'siparise_donustu' }).eq('id', po.id)
    await logAdminAction('preorder_converted_to_order', `preorder:${po.id}`, {
      order_id: orderId,
      dealer_id: po.dealer_id,
      school_name: po.school_name,
      total,
    })
    setDetail(null); loadAll()
    alert('Sipariş oluşturuldu: ' + orderId)
  }

  const STATUS = {
    on_siparis: { label: 'Ön Sipariş', color: COLORS.orange },
    kesinlesti: { label: 'Kesinleşti (Bayi)', color: COLORS.primary },
    siparise_donustu: { label: 'Siparişe Dönüştü', color: COLORS.green },
    iptal: { label: 'İptal', color: '#aaa' }
  }

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 20 }}>Ön Siparişler</h2>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr><th style={S.th}>No</th><th style={S.th}>Bayi</th><th style={S.th}>Okul</th><th style={S.th}>Sezon</th><th style={S.th}>Toplam</th><th style={S.th}>Durum</th><th style={S.th}></th></tr></thead>
          <tbody>{preOrders.length === 0 ? (
            <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 32 }}>Ön sipariş yok</td></tr>
          ) : preOrders.map(po => {
            const items = po.pre_order_items || []
            const total = items.reduce((s, i) => s + ((i.qty || 0) * (i.unit_price || 0)), 0)
            return (
              <tr key={po.id}>
                <td style={S.td}><strong style={{ color: COLORS.primary }}>{po.id}</strong></td>
                <td style={S.td}>{getDealerName(po.dealer_id)}</td>
                <td style={S.td}>{po.school_name}</td>
                <td style={S.td}>{po.season}</td>
                <td style={S.td}><strong>{fmt(total)}</strong></td>
                <td style={S.td}><span style={S.badge(STATUS[po.status]?.color || '#aaa')}>{STATUS[po.status]?.label || po.status}</span></td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button style={{ ...S.btn(COLORS.teal), fontSize: 11, padding: '5px 10px' }} onClick={() => setDetail(po)}>Detay</button>
                    {(po.status === 'on_siparis' || po.status === 'kesinlesti') && <button style={{ ...S.btn(COLORS.green), fontSize: 11, padding: '5px 10px' }} onClick={() => convertToOrder(po)}>Siparişe Dönüştür</button>}
                  </div>
                </td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
      {detail && (
        <div style={S.modal} onClick={() => setDetail(null)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 640, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <h3 style={{ color: COLORS.primary }}>Ön Sipariş Detayı</h3>
              <button style={S.btn('#aaa')} onClick={() => setDetail(null)}>Kapat</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16, background: '#f8f4ff', borderRadius: 10, padding: 14 }}>
              <div><span style={{ fontSize: 11, color: '#888' }}>BAYİ</span><div style={{ fontWeight: 700 }}>{getDealerName(detail.dealer_id)}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>OKUL</span><div style={{ fontWeight: 700 }}>{detail.school_name}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>SEZON</span><div style={{ fontWeight: 700 }}>{detail.season}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>ADRES</span><div style={{ fontWeight: 700 }}>{detail.address || '-'}</div></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
              <thead><tr><th style={S.th}>Ürün</th><th style={S.th}>Adet</th><th style={S.th}>Birim Fiyat</th><th style={S.th}>Toplam</th></tr></thead>
              <tbody>{(detail.pre_order_items || []).map((item, idx) => (
                <tr key={idx}>
                  <td style={S.td}>{products.find(p => p.id === item.product_id)?.name || '-'}</td>
                  <td style={S.td}>{item.qty}</td>
                  <td style={S.td}>{fmt(item.unit_price)}</td>
                  <td style={S.td}><strong>{fmt((item.qty || 0) * (item.unit_price || 0))}</strong></td>
                </tr>
              ))}</tbody>
              <tfoot>
                <tr style={{ background: '#f8f4ff' }}>
                  <td colSpan={3} style={{ ...S.td, fontWeight: 800, textAlign: 'right' }}>TOPLAM:</td>
                  <td style={{ ...S.td, fontWeight: 800, color: COLORS.primary }}>{fmt((detail.pre_order_items || []).reduce((s, i) => s + ((i.qty || 0) * (i.unit_price || 0)), 0))}</td>
                </tr>
              </tfoot>
            </table>
            {detail.note && <div style={{ marginTop: 12, padding: 12, background: '#f8f4ff', borderRadius: 8, fontSize: 13 }}>Not: {detail.note}</div>}
            {(detail.status === 'on_siparis' || detail.status === 'kesinlesti') && (
              <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end', marginTop: 16 }}>
                <button style={S.btn(COLORS.green)} onClick={() => convertToOrder(detail)}>Siparişe Dönüştür</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Orders({ dealers, orders, products, loadAll, getDealerName, logAdminAction, isMobile }) {
  const [modal, setModal] = useState(false)
  const [processModal, setProcessModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [classItems, setClassItems] = useState([{ grade: '1. Sınıf', branch: '', teacher: '', qty: '' }])
  const [processForm, setProcessForm] = useState({ cargo_date: '', cargo_fee: '', free_qty: 0, dia_cari_kodu: '', dia_fatura_no: '', dia_status: false, invoice_status: 'kesilmedi', cargo_status: 'faturalanmadi' })
  const [form, setForm] = useState({ dealer_id: '', school_name: '', season: '2026-2027', product_id: '', qty: '', unit_price: '', free_qty: 0, cargo_fee: '', cargo_date: '', invoice_status: 'kesilmedi', dia_status: false, note: '' })

  const total = (parseInt(form.qty) || 0) * (parseFloat(form.unit_price) || 0)

  const openProcess = async (order) => {
    setSelectedOrder(order)
    setProcessForm({
      cargo_date: order.cargo_date || '',
      cargo_fee: order.cargo_fee || '',
      free_qty: order.free_qty || 0,
      dia_cari_kodu: order.dia_cari_kodu || '',
      dia_fatura_no: order.dia_fatura_no || '',
      dia_status: order.dia_status || false,
      invoice_status: order.invoice_status || 'kesilmedi',
      cargo_status: order.cargo_status || 'faturalanmadi',
    })
    // Mevcut sınıf dağılımını yükle
    const { data } = await supabase.from('order_class_items').select('*').eq('order_id', order.id)
    if (data && data.length > 0) {
      setClassItems(data.map(d => ({ grade: d.grade, branch: d.branch, teacher: d.teacher, qty: d.qty })))
    } else {
      setClassItems([{ grade: '1. Sınıf', branch: '', teacher: '', qty: '' }])
    }
    setProcessModal(true)
  }

  const addClassItem = () => setClassItems(prev => [...prev, { grade: '1. Sınıf', branch: '', teacher: '', qty: '' }])
  const removeClassItem = (idx) => setClassItems(prev => prev.filter((_, i) => i !== idx))
  const updateClassItem = (idx, field, value) => {
    setClassItems(prev => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next })
  }

  const saveProcess = async () => {
    await supabase.from('orders').update({
      cargo_date: processForm.cargo_date || null,
      cargo_fee: parseFloat(processForm.cargo_fee) || 0,
      free_qty: parseInt(processForm.free_qty) || 0,
      dia_cari_kodu: processForm.dia_cari_kodu,
      dia_fatura_no: processForm.dia_fatura_no,
      dia_status: processForm.dia_status,
      invoice_status: processForm.invoice_status,
      cargo_status: processForm.cargo_status,
      status: 'hazirlaniyor',
    }).eq('id', selectedOrder.id)

    // Sınıf dağılımını kaydet
    await supabase.from('order_class_items').delete().eq('order_id', selectedOrder.id)
    const validItems = classItems.filter(i => i.grade && parseInt(i.qty) > 0)
    if (validItems.length > 0) {
      await supabase.from('order_class_items').insert(validItems.map(i => ({
        order_id: selectedOrder.id, grade: i.grade, branch: i.branch, teacher: i.teacher, qty: parseInt(i.qty)
      })))
    }
    await logAdminAction('order_processed', `order:${selectedOrder.id}`, {
      status: 'hazirlaniyor',
      cargo_status: processForm.cargo_status,
      invoice_status: processForm.invoice_status,
      dia_status: processForm.dia_status,
      class_items: validItems.length,
    })
    setProcessModal(false); loadAll()
  }

  const save = async () => {
    if (!form.dealer_id || !form.product_id || !form.qty) return
    const orderId = 'SIP-' + Date.now().toString().slice(-6)
    await supabase.from('orders').insert([{ id: orderId, dealer_id: form.dealer_id, school_name: form.school_name, season: form.season, total, cargo_fee: parseFloat(form.cargo_fee) || 0, cargo_date: form.cargo_date || null, cargo_status: 'faturalanmadi', invoice_status: form.invoice_status, dia_status: form.dia_status, note: form.note, status: 'beklemede' }])
    await supabase.from('order_items').insert([{ order_id: orderId, product_id: parseInt(form.product_id), qty: parseInt(form.qty), unit_price: parseFloat(form.unit_price), free_qty: parseInt(form.free_qty) || 0 }])
    const dealer = dealers.find(d => d.id === form.dealer_id)
    await supabase.from('dealers').update({ balance: (dealer?.balance || 0) - total }).eq('id', form.dealer_id)
    await logAdminAction('order_created', `order:${orderId}`, {
      dealer_id: form.dealer_id,
      school_name: form.school_name,
      season: form.season,
      total,
    })
    setModal(false)
    setForm({ dealer_id: '', school_name: '', season: '2026-2027', product_id: '', qty: '', unit_price: '', free_qty: 0, cargo_fee: '', cargo_date: '', invoice_status: 'kesilmedi', dia_status: false, note: '' })
    loadAll()
  }

  const updateField = async (id, field, value) => {
    await supabase.from('orders').update({ [field]: value }).eq('id', id)
    await logAdminAction('order_field_updated', `order:${id}`, { field, value })
    loadAll()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <h2 style={{ color: COLORS.primary }}>Siparişler</h2>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Sipariş Ekle</button>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
          <thead><tr>
            <th style={S.th}>No</th><th style={S.th}>Bayi</th><th style={S.th}>Okul</th><th style={S.th}>Sezon</th><th style={S.th}>Tutar</th><th style={S.th}>Durum</th><th style={S.th}>Sevk</th><th style={S.th}>Fatura</th><th style={S.th}>Dia</th><th style={S.th}></th>
          </tr></thead>
          <tbody>{orders.map(o => (
            <tr key={o.id}>
              <td style={S.td}><strong style={{ color: COLORS.primary }}>{o.id}</strong></td>
              <td style={S.td}>{getDealerName(o.dealer_id)}</td>
              <td style={S.td}>{o.school_name || '-'}</td>
              <td style={S.td}>{o.season}</td>
              <td style={S.td}><strong>{fmt(o.total)}</strong></td>
              <td style={S.td}>
                <select value={o.status || 'beklemede'} onChange={e => updateField(o.id, 'status', e.target.value)} style={{ ...S.select, width: 130, fontSize: 11, padding: '4px 8px' }}>
                  <option value="beklemede">Beklemede</option>
                  <option value="hazirlaniyor">Hazırlanıyor</option>
                  <option value="yolda">Yolda</option>
                  <option value="teslim_edildi">Teslim Edildi</option>
                  <option value="iptal">İptal</option>
                </select>
              </td>
              <td style={S.td}>{fmtDate(o.cargo_date)}</td>
              <td style={S.td}><span style={S.badge(o.invoice_status === 'kesildi' ? COLORS.green : COLORS.orange)}>{o.invoice_status}</span></td>
              <td style={S.td}><span style={S.badge(o.dia_status ? COLORS.green : '#aaa')}>{o.dia_status ? 'İşlendi' : 'İşlenmedi'}</span></td>
              <td style={S.td}>
                <button style={{ ...S.btn(COLORS.teal), fontSize: 11, padding: '5px 10px' }} onClick={() => openProcess(o)}>İşleme Al</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* İşleme Al Modalı */}
      {processModal && selectedOrder && (
        <div style={S.modal} onClick={() => setProcessModal(false)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 720, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 4 }}>Siparişi İşleme Al</h3>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>{selectedOrder.id} — {getDealerName(selectedOrder.dealer_id)} / {selectedOrder.school_name}</div>

            {/* Sevk Bilgileri */}
            <div style={{ background: '#f8f4ff', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>SEVK BİLGİLERİ</div>
              <div style={S.grid2}>
                <div><label style={S.label}>Sevk Tarihi</label><input type="date" style={S.input} value={processForm.cargo_date} onChange={e => setProcessForm(p => ({ ...p, cargo_date: e.target.value }))} /></div>
                <div><label style={S.label}>Kargo Tutarı</label><input type="number" style={S.input} value={processForm.cargo_fee} onChange={e => setProcessForm(p => ({ ...p, cargo_fee: e.target.value }))} /></div>
                <div><label style={S.label}>Ücretsiz Set Adedi</label><input type="number" style={S.input} value={processForm.free_qty} onChange={e => setProcessForm(p => ({ ...p, free_qty: e.target.value }))} /></div>
                <div><label style={S.label}>Kargo Durumu</label>
                  <select style={S.select} value={processForm.cargo_status} onChange={e => setProcessForm(p => ({ ...p, cargo_status: e.target.value }))}>
                    <option value="faturalanmadi">Faturalanmadı</option>
                    <option value="odendi">Ödendi</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sınıf Dağılımı */}
            <div style={{ background: '#f0fff4', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 10, gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green }}>SINIF DAĞILIMI</div>
                <button style={{ ...S.btn(COLORS.green), fontSize: 11, padding: '4px 10px' }} onClick={addClassItem}>+ Satır Ekle</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <thead><tr>
                  <th style={{ ...S.th, width: 140 }}>Sınıf Seviyesi</th>
                  <th style={{ ...S.th, width: 80 }}>Şube</th>
                  <th style={S.th}>Sorumlu Öğretmen</th>
                  <th style={{ ...S.th, width: 80 }}>Adet</th>
                  <th style={{ ...S.th, width: 40 }}></th>
                </tr></thead>
                <tbody>{classItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={S.td}>
                      <select style={{ ...S.select, fontSize: 12, padding: '6px 8px' }} value={item.grade} onChange={e => updateClassItem(idx, 'grade', e.target.value)}>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.input, textAlign: 'center', fontSize: 12, padding: '6px 8px' }} value={item.branch} onChange={e => updateClassItem(idx, 'branch', e.target.value)} placeholder="A,B..." />
                    </td>
                    <td style={S.td}>
                      <input style={{ ...S.input, fontSize: 12, padding: '6px 8px' }} value={item.teacher} onChange={e => updateClassItem(idx, 'teacher', e.target.value)} placeholder="Ad Soyad" />
                    </td>
                    <td style={S.td}>
                      <input type="number" style={{ ...S.input, textAlign: 'center', fontSize: 12, padding: '6px 8px' }} value={item.qty} onChange={e => updateClassItem(idx, 'qty', e.target.value)} placeholder="0" />
                    </td>
                    <td style={S.td}>
                      {idx > 0 && <button style={{ ...S.btn('#ef4444'), padding: '4px 8px', fontSize: 11 }} onClick={() => removeClassItem(idx)}>✕</button>}
                    </td>
                  </tr>
                ))}</tbody>
                <tfoot>
                  <tr style={{ background: '#f0fff4' }}>
                    <td colSpan={3} style={{ ...S.td, fontWeight: 700, textAlign: 'right', color: COLORS.green }}>Toplam:</td>
                    <td style={{ ...S.td, fontWeight: 700, color: COLORS.green }}>{classItems.reduce((s, i) => s + (parseInt(i.qty) || 0), 0)}</td>
                    <td style={S.td}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Fatura & Dia */}
            <div style={{ background: '#f8f0ff', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>FATURA & DIA BİLGİLERİ</div>
              <div style={S.grid2}>
                <div><label style={S.label}>Fatura Durumu</label>
                  <select style={S.select} value={processForm.invoice_status} onChange={e => setProcessForm(p => ({ ...p, invoice_status: e.target.value }))}>
                    <option value="kesilmedi">Kesilmedi</option>
                    <option value="kesildi">Kesildi</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input type="checkbox" id="dia_proc" checked={processForm.dia_status} onChange={e => setProcessForm(p => ({ ...p, dia_status: e.target.checked }))} />
                  <label htmlFor="dia_proc" style={{ fontSize: 13, fontWeight: 600 }}>Dia'ya İşlendi</label>
                </div>
                <div><label style={S.label}>Dia Cari Kodu</label><input style={S.input} value={processForm.dia_cari_kodu} onChange={e => setProcessForm(p => ({ ...p, dia_cari_kodu: e.target.value }))} placeholder="CARI-001" /></div>
                <div><label style={S.label}>Dia Fatura No</label><input style={S.input} value={processForm.dia_fatura_no} onChange={e => setProcessForm(p => ({ ...p, dia_fatura_no: e.target.value }))} placeholder="FTR-2026-001" /></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: isMobile ? 'flex-start' : 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
              <button style={S.btn('#aaa')} onClick={() => setProcessModal(false)}>İptal</button>
              <button style={S.btn(COLORS.green)} onClick={saveProcess}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div style={S.modal} onClick={() => setModal(false)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 580, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 20 }}>Yeni Sipariş</h3>
            <div style={S.grid2}>
              <div><label style={S.label}>Bayi</label><select style={S.select} value={form.dealer_id} onChange={e => setForm(p => ({ ...p, dealer_id: e.target.value }))}><option value="">Seçiniz...</option>{dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label style={S.label}>Okul</label><input style={S.input} value={form.school_name} onChange={e => setForm(p => ({ ...p, school_name: e.target.value }))} /></div>
              <div><label style={S.label}>Ürün</label><select style={S.select} value={form.product_id} onChange={e => setForm(p => ({ ...p, product_id: e.target.value }))}><option value="">Seçiniz...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label style={S.label}>Sezon</label><select style={S.select} value={form.season} onChange={e => setForm(p => ({ ...p, season: e.target.value }))}><option>2024-2025</option><option>2025-2026</option><option>2026-2027</option></select></div>
              <div><label style={S.label}>Adet</label><input type="number" style={S.input} value={form.qty} onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} /></div>
              <div><label style={S.label}>Birim Fiyat</label><input type="number" style={S.input} value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} /></div>
              <div><label style={S.label}>Ücretsiz Adet</label><input type="number" style={S.input} value={form.free_qty} onChange={e => setForm(p => ({ ...p, free_qty: e.target.value }))} /></div>
              <div><label style={S.label}>Kargo Tutarı</label><input type="number" style={S.input} value={form.cargo_fee} onChange={e => setForm(p => ({ ...p, cargo_fee: e.target.value }))} /></div>
              <div><label style={S.label}>Sevk Tarihi</label><input type="date" style={S.input} value={form.cargo_date} onChange={e => setForm(p => ({ ...p, cargo_date: e.target.value }))} /></div>
              <div><label style={S.label}>Fatura</label><select style={S.select} value={form.invoice_status} onChange={e => setForm(p => ({ ...p, invoice_status: e.target.value }))}><option value="kesilmedi">Kesilmedi</option><option value="kesildi">Kesildi</option></select></div>
            </div>
            <div style={{ marginTop: 14 }}><label style={S.label}>Not</label><input style={S.input} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} /></div>
            <div style={{ background: '#f8f4ff', borderRadius: 10, padding: 12, marginTop: 14, textAlign: 'right' }}>
              <span style={{ fontSize: 13, color: '#888' }}>Toplam: </span>
              <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary }}>{fmt(total)}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: isMobile ? 'flex-start' : 'flex-end', marginTop: 20, flexDirection: isMobile ? 'column' : 'row' }}>
              <button style={S.btn('#aaa')} onClick={() => setModal(false)}>İptal</button>
              <button style={S.btn()} onClick={save}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Payments({ dealers, payments, loadAll, logAdminAction, isMobile }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ dealer_id: '', amount: '', method: 'havale', commission_rate: '', note: '' })

  const totalAmount = () => {
    const base = parseFloat(form.amount) || 0
    if (form.method === 'kredi_karti' && form.commission_rate) return base + (base * parseFloat(form.commission_rate) / 100)
    return base
  }

  const save = async () => {
    if (!form.dealer_id || !form.amount) return
    const total = totalAmount()
    const payId = 'OD-' + Date.now().toString().slice(-6)
    await supabase.from('payments').insert([{ id: payId, dealer_id: form.dealer_id, amount: total, method: form.method, note: form.note }])
    const dealer = dealers.find(d => d.id === form.dealer_id)
    await supabase.from('dealers').update({ balance: (dealer?.balance || 0) + total }).eq('id', form.dealer_id)
    await logAdminAction('payment_added', `payment:${payId}`, {
      dealer_id: form.dealer_id,
      amount: total,
      method: form.method,
    })
    setModal(false)
    setForm({ dealer_id: '', amount: '', method: 'havale', commission_rate: '', note: '' })
    loadAll()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <h2 style={{ color: COLORS.primary }}>Ödemeler</h2>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Ödeme Ekle</button>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr><th style={S.th}>No</th><th style={S.th}>Bayi</th><th style={S.th}>Tarih</th><th style={S.th}>Yöntem</th><th style={S.th}>Tutar</th><th style={S.th}>Not</th></tr></thead>
          <tbody>{payments.map(p => (
            <tr key={p.id}>
              <td style={S.td}><strong style={{ color: COLORS.green }}>{p.id}</strong></td>
              <td style={S.td}>{dealers.find(d => d.id === p.dealer_id)?.name || '-'}</td>
              <td style={S.td}>{fmtDate(p.date)}</td>
              <td style={S.td}><span style={S.badge(COLORS.teal)}>{p.method}</span></td>
              <td style={S.td}><strong style={{ color: COLORS.green }}>{fmt(p.amount)}</strong></td>
              <td style={S.td}>{p.note || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal && (
        <div style={S.modal} onClick={() => setModal(false)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 580, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 20 }}>Ödeme Ekle</h3>
            <div style={S.grid2}>
              <div><label style={S.label}>Bayi</label><select style={S.select} value={form.dealer_id} onChange={e => setForm(p => ({ ...p, dealer_id: e.target.value }))}><option value="">Seçiniz...</option>{dealers.map(d => <option key={d.id} value={d.id}>{d.name} ({fmt(d.balance)})</option>)}</select></div>
              <div><label style={S.label}>Yöntem</label><select style={S.select} value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}><option value="havale">Havale/EFT</option><option value="nakit">Nakit</option><option value="kredi_karti">Kredi Kartı</option></select></div>
              <div><label style={S.label}>Tutar</label><input type="number" style={S.input} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
              {form.method === 'kredi_karti' && <div><label style={S.label}>Komisyon (%)</label><input type="number" step="0.1" style={S.input} value={form.commission_rate} onChange={e => setForm(p => ({ ...p, commission_rate: e.target.value }))} placeholder="2.5" /></div>}
            </div>
            <div style={{ marginTop: 14 }}><label style={S.label}>Not</label><input style={S.input} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} /></div>
            {form.method === 'kredi_karti' && form.commission_rate && (
              <div style={{ background: '#f8f4ff', borderRadius: 10, padding: 12, marginTop: 14 }}>
                <div style={{ fontSize: 12, color: '#888' }}>Komisyon: {fmt((parseFloat(form.amount) || 0) * parseFloat(form.commission_rate) / 100)}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.primary }}>Toplam: {fmt(totalAmount())}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: isMobile ? 'flex-start' : 'flex-end', marginTop: 20, flexDirection: isMobile ? 'column' : 'row' }}>
              <button style={S.btn('#aaa')} onClick={() => setModal(false)}>İptal</button>
              <button style={S.btn(COLORS.green)} onClick={save}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Checks({ dealers, checks, loadAll, logAdminAction, isMobile }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ dealer_id: '', amount: '', due_date: '', status: 'musteride', bank: '', note: '' })
  const STATUS = { musteride: { label: 'Müşteride', color: COLORS.orange }, portfolyde: { label: 'Portföyde', color: COLORS.teal }, tedarikcide: { label: 'Tedarikçide', color: COLORS.primary }, tahsil_edildi: { label: 'Tahsil Edildi', color: COLORS.green } }

  const save = async () => {
    if (!form.dealer_id || !form.amount || !form.due_date) return
    await supabase.from('checks').insert([{ ...form, amount: parseFloat(form.amount) }])
    const payId = 'CEK-' + Date.now().toString().slice(-6)
    await supabase.from('payments').insert([{ id: payId, dealer_id: form.dealer_id, amount: parseFloat(form.amount), method: 'cek', note: 'Vade: ' + form.due_date + (form.bank ? ' / ' + form.bank : '') }])
    const dealer = dealers.find(d => d.id === form.dealer_id)
    await supabase.from('dealers').update({ balance: (dealer?.balance || 0) + parseFloat(form.amount) }).eq('id', form.dealer_id)
    await logAdminAction('check_added', `dealer:${form.dealer_id}`, {
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      status: form.status,
      bank: form.bank || null,
      payment_id: payId,
    })
    setModal(false)
    setForm({ dealer_id: '', amount: '', due_date: '', status: 'musteride', bank: '', note: '' })
    loadAll()
  }

  const updateStatus = async (id, status) => {
    await supabase.from('checks').update({ status }).eq('id', id)
    await logAdminAction('check_status_updated', `check:${id}`, { status })
    loadAll()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <h2 style={{ color: COLORS.primary }}>Çekler</h2>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Çek Ekle</button>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead><tr><th style={S.th}>Bayi</th><th style={S.th}>Tutar</th><th style={S.th}>Vade</th><th style={S.th}>Banka</th><th style={S.th}>Durum</th><th style={S.th}></th></tr></thead>
          <tbody>{checks.map(c => (
            <tr key={c.id}>
              <td style={S.td}>{dealers.find(d => d.id === c.dealer_id)?.name || '-'}</td>
              <td style={S.td}><strong>{fmt(c.amount)}</strong></td>
              <td style={S.td}>{fmtDate(c.due_date)}</td>
              <td style={S.td}>{c.bank || '-'}</td>
              <td style={S.td}><span style={S.badge(STATUS[c.status]?.color || '#888')}>{STATUS[c.status]?.label || c.status}</span></td>
              <td style={S.td}><select value={c.status} onChange={e => updateStatus(c.id, e.target.value)} style={{ ...S.select, width: 140, fontSize: 11, padding: '4px 8px' }}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal && (
        <div style={S.modal} onClick={() => setModal(false)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 580, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 20 }}>Çek Ekle</h3>
            <div style={S.grid2}>
              <div><label style={S.label}>Bayi</label><select style={S.select} value={form.dealer_id} onChange={e => setForm(p => ({ ...p, dealer_id: e.target.value }))}><option value="">Seçiniz...</option>{dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label style={S.label}>Tutar</label><input type="number" style={S.input} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
              <div><label style={S.label}>Vade Tarihi</label><input type="date" style={S.input} value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              <div><label style={S.label}>Banka</label><input style={S.input} value={form.bank} onChange={e => setForm(p => ({ ...p, bank: e.target.value }))} /></div>
              <div><label style={S.label}>Durum</label><select style={S.select} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            </div>
            <div style={{ marginTop: 14 }}><label style={S.label}>Not</label><input style={S.input} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} /></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: isMobile ? 'flex-start' : 'flex-end', marginTop: 20, flexDirection: isMobile ? 'column' : 'row' }}>
              <button style={S.btn('#aaa')} onClick={() => setModal(false)}>İptal</button>
              <button style={S.btn()} onClick={save}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Products({ products, loadAll, logAdminAction, isMobile }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', sku: '', box_size: '', default_price: '' })

  const save = async () => {
    if (!form.name) return
    const { data: insertedProduct } = await supabase.from('products').insert([{ ...form, box_size: parseInt(form.box_size) || 0, default_price: parseFloat(form.default_price) || 0 }]).select('id, name, sku').single()
    await logAdminAction('product_added', `product:${insertedProduct?.id || 'new'}`, {
      name: insertedProduct?.name || form.name,
      sku: insertedProduct?.sku || form.sku || null,
      default_price: parseFloat(form.default_price) || 0,
    })
    setModal(false)
    setForm({ name: '', sku: '', box_size: '', default_price: '' })
    loadAll()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <h2 style={{ color: COLORS.primary }}>Ürünler</h2>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Ürün Ekle</button>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
          <thead><tr><th style={S.th}>SKU</th><th style={S.th}>Ürün Adı</th><th style={S.th}>Kutu İçi</th><th style={S.th}>Varsayılan Fiyat</th></tr></thead>
          <tbody>{products.map(p => (
            <tr key={p.id}>
              <td style={S.td}><span style={S.badge(COLORS.teal)}>{p.sku}</span></td>
              <td style={S.td}><strong>{p.name}</strong></td>
              <td style={S.td}>{p.box_size}</td>
              <td style={S.td}><strong style={{ color: COLORS.primary }}>{fmt(p.default_price)}</strong></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal && (
        <div style={S.modal} onClick={() => setModal(false)}>
          <div style={{ ...S.modalBox, width: isMobile ? '95vw' : 580, padding: isMobile ? 18 : 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 20 }}>Yeni Ürün</h3>
            <div style={S.grid2}>
              <div><label style={S.label}>Ürün Adı</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label style={S.label}>SKU</label><input style={S.input} value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} /></div>
              <div><label style={S.label}>Kutu İçi</label><input type="number" style={S.input} value={form.box_size} onChange={e => setForm(p => ({ ...p, box_size: e.target.value }))} /></div>
              <div><label style={S.label}>Varsayılan Fiyat</label><input type="number" style={S.input} value={form.default_price} onChange={e => setForm(p => ({ ...p, default_price: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: isMobile ? 'flex-start' : 'flex-end', marginTop: 20, flexDirection: isMobile ? 'column' : 'row' }}>
              <button style={S.btn('#aaa')} onClick={() => setModal(false)}>İptal</button>
              <button style={S.btn()} onClick={save}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}