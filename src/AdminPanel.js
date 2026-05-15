import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const COLORS = {
  primary: '#8C479C', yellow: '#FCC400', teal: '#60CDCB',
  green: '#86B535', orange: '#EC6A34', pink: '#D7508B', bg: '#f8f4ff',
}

const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-'

const GRADES = ['4 Yas', '5-6 Yas', '1. Sinif', '2. Sinif', '3. Sinif', '4. Sinif', '5. Sinif', '6. Sinif', '7. Sinif', '8. Sinif']

const S = {
  sidebar: { width: 220, minHeight: '100vh', background: COLORS.primary, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 100 },
  main: { marginLeft: 220, minHeight: '100vh', background: COLORS.bg, padding: 28 },
  navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', cursor: 'pointer', background: active ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', fontSize: 14, fontWeight: active ? 700 : 400, borderLeft: active ? '4px solid #FCC400' : '4px solid transparent' }),
  card: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(140,71,156,0.08)' },
  btn: (color) => ({ padding: '9px 18px', borderRadius: 9, background: color || COLORS.primary, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }),
  input: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '2px solid #f0e8ff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '2px solid #f0e8ff', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' },
  label: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', padding: '10px 12px', borderBottom: '2px solid #f0e8ff' },
  td: { padding: '11px 12px', fontSize: 13, color: '#333', borderBottom: '1px solid #f9f0ff' },
  badge: (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + '22', color: color }),
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modalBox: { background: '#fff', borderRadius: 16, padding: 28, width: 580, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
}

const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'dealers', icon: '🏪', label: 'Bayiler' },
  { id: 'preorders', icon: '📋', label: 'On Siparisler' },
  { id: 'orders', icon: '📦', label: 'Siparisler' },
  { id: 'payments', icon: '💰', label: 'Odemeler' },
  { id: 'checks', icon: '🏦', label: 'Cekler' },
  { id: 'products', icon: '🔬', label: 'Urunler' },
]

export default function AdminPanel({ onLogout }) {
  const [page, setPage] = useState('dashboard')
  const [dealers, setDealers] = useState([])
  const [orders, setOrders] = useState([])
  const [preOrders, setPreOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [checks, setChecks] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [d, o, po, p, c, pr] = await Promise.all([
      supabase.from('dealers').select('*').order('name'),
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
  }

  const getDealerName = (id) => dealers.find(d => d.id === id)?.name || '-'
  const props = { dealers, orders, preOrders, payments, checks, products, loadAll, getDealerName }

  return (
    <div style={{ display: 'flex', fontFamily: 'inherit' }}>
      <div style={S.sidebar}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Kesif Kutusu</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>Admin Paneli</div>
        </div>
        <div style={{ flex: 1, paddingTop: 8 }}>
          {NAV.map(n => (
            <div key={n.id} style={S.navItem(page === n.id)} onClick={() => setPage(n.id)}>
              <span>{n.icon}</span><span>{n.label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 20 }}>
          <button onClick={onLogout} style={{ ...S.btn('rgba(255,255,255,0.2)'), width: '100%', fontSize: 12 }}>Cikis Yap</button>
        </div>
      </div>
      <div style={S.main}>
        {page === 'dashboard' && <Dashboard {...props} />}
        {page === 'dealers' && <Dealers {...props} />}
        {page === 'preorders' && <PreOrders {...props} />}
        {page === 'orders' && <Orders {...props} />}
        {page === 'payments' && <Payments {...props} />}
        {page === 'checks' && <Checks {...props} />}
        {page === 'products' && <Products {...props} />}
      </div>
    </div>
  )
}

function Dashboard({ dealers, orders, payments, checks, preOrders }) {
  const totalOrders = orders.reduce((s, o) => s + (o.total || 0), 0)
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const pendingChecks = checks.filter(c => c.status !== 'tahsil_edildi').reduce((s, c) => s + (c.amount || 0), 0)
  const debtDealers = dealers.filter(d => (d.balance || 0) < 0).length
  const pendingPreOrders = preOrders.filter(p => p.status === 'on_siparis').length

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 24 }}>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Toplam Ciro', value: fmt(totalOrders), color: COLORS.primary, icon: '📦' },
          { label: 'Tahsilat', value: fmt(totalPayments), color: COLORS.green, icon: '💰' },
          { label: 'Bekleyen Cek', value: fmt(pendingChecks), color: COLORS.orange, icon: '🏦' },
          { label: 'Borclu Bayi', value: debtDealers, color: COLORS.pink, icon: '🏪' },
          { label: 'On Siparis', value: pendingPreOrders, color: COLORS.yellow, icon: '📋' },
        ].map(s => (
          <div key={s.label} style={{ ...S.card, borderTop: '4px solid ' + s.color }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={S.card}>
          <h3 style={{ color: COLORS.primary, marginBottom: 16, fontSize: 15 }}>Son Siparisler</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
    </div>
  )
}

function Dealers({ dealers, products, loadAll }) {
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [priceModal, setPriceModal] = useState(false)
  const [selectedDealer, setSelectedDealer] = useState(null)
  const [form, setForm] = useState({ name: '', city: '', contact: '', phone: '', email: '', tax_no: '', tax_office: '', address: '', username: '', password_hash: '', credit_limit: 0 })
  const [prices, setPrices] = useState({})

  const openEdit = (dealer) => { setSelectedDealer(dealer); setForm({ ...dealer }); setEditModal(true) }

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
    loadAll()
  }

  const saveEdit = async () => {
    await supabase.from('dealers').update({ ...form, credit_limit: parseInt(form.credit_limit) || 0 }).eq('id', selectedDealer.id)
    setEditModal(false); loadAll()
  }

  const savePrices = async () => {
    for (const [productId, price] of Object.entries(prices)) {
      if (!price) continue
      const { data: existing } = await supabase.from('dealer_prices').select('id').eq('dealer_id', selectedDealer.id).eq('product_id', parseInt(productId)).single()
      if (existing) {
        await supabase.from('dealer_prices').update({ price: parseFloat(price) }).eq('id', existing.id)
      } else {
        await supabase.from('dealer_prices').insert([{ dealer_id: selectedDealer.id, product_id: parseInt(productId), price: parseFloat(price), season: '2026-2027' }])
      }
    }
    setPriceModal(false); loadAll()
  }

  const save = async () => {
    if (!form.name) return
    await supabase.from('dealers').insert([{ ...form, balance: 0, credit_limit: parseInt(form.credit_limit) || 0 }])
    setModal(false)
    setForm({ name: '', city: '', contact: '', phone: '', email: '', tax_no: '', tax_office: '', address: '', username: '', password_hash: '', credit_limit: 0 })
    loadAll()
  }

  const FIELDS = [['name','Firma Adi'],['city','Sehir'],['contact','Yetkili'],['phone','Telefon'],['email','E-posta'],['tax_no','Vergi No'],['tax_office','Vergi Dairesi'],['username','Kullanici Adi'],['password_hash','Sifre'],['credit_limit','Kredi Limiti']]

  const FormModal = ({ title, onClose, onSave }) => (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <h3 style={{ color: COLORS.primary, marginBottom: 20 }}>{title}</h3>
        <div style={S.grid2}>{FIELDS.map(([k,l]) => (<div key={k}><label style={S.label}>{l}</label><input style={S.input} value={form[k] || ''} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} /></div>))}</div>
        <div style={{ marginTop: 14 }}><label style={S.label}>Adres</label><input style={S.input} value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button style={S.btn('#aaa')} onClick={onClose}>Iptal</button>
          <button style={S.btn()} onClick={onSave}>Kaydet</button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: COLORS.primary }}>Bayiler</h2>
        <button style={S.btn()} onClick={() => { setForm({ name: '', city: '', contact: '', phone: '', email: '', tax_no: '', tax_office: '', address: '', username: '', password_hash: '', credit_limit: 0 }); setModal(true) }}>+ Bayi Ekle</button>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={S.th}>Bayi</th><th style={S.th}>Sehir</th><th style={S.th}>Yetkili</th><th style={S.th}>Kullanici</th><th style={S.th}>Bakiye</th><th style={S.th}></th></tr></thead>
          <tbody>{dealers.map(dealer => (
            <tr key={dealer.id}>
              <td style={S.td}><strong>{dealer.name}</strong><br /><span style={{ fontSize: 11, color: '#888' }}>{dealer.email}</span></td>
              <td style={S.td}>{dealer.city}</td>
              <td style={S.td}>{dealer.contact}</td>
              <td style={S.td}><span style={S.badge(COLORS.teal)}>{dealer.username}</span></td>
              <td style={S.td}><span style={{ fontWeight: 700, color: (dealer.balance || 0) < 0 ? COLORS.orange : COLORS.green }}>{fmt(dealer.balance)}</span></td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ ...S.btn(COLORS.teal), fontSize: 11, padding: '5px 10px' }} onClick={() => openEdit(dealer)}>Duzenle</button>
                  <button style={{ ...S.btn(COLORS.green), fontSize: 11, padding: '5px 10px' }} onClick={() => openPrices(dealer)}>Fiyatlar</button>
                  <button style={{ ...S.btn('#ef4444'), fontSize: 11, padding: '5px 10px' }} onClick={() => deleteDealer(dealer)}>Sil</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {modal && <FormModal title="Yeni Bayi" onClose={() => setModal(false)} onSave={save} />}
      {editModal && selectedDealer && <FormModal title={'Duzenle: ' + selectedDealer.name} onClose={() => setEditModal(false)} onSave={saveEdit} />}

      {priceModal && selectedDealer && (
        <div style={S.modal} onClick={() => setPriceModal(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 4 }}>Fiyat Listesi</h3>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>{selectedDealer.name}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={S.th}>Urun</th><th style={S.th}>Varsayilan</th><th style={S.th}>Bayi Fiyati</th></tr></thead>
              <tbody>{products.map(p => (
                <tr key={p.id}>
                  <td style={S.td}><strong>{p.name}</strong></td>
                  <td style={S.td}>{fmt(p.default_price)}</td>
                  <td style={S.td}><input type="number" style={{ ...S.input, width: 130 }} value={prices[p.id] || ''} onChange={e => setPrices(prev => ({ ...prev, [p.id]: e.target.value }))} placeholder={p.default_price} /></td>
                </tr>
              ))}</tbody>
            </table>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btn('#aaa')} onClick={() => setPriceModal(false)}>Iptal</button>
              <button style={S.btn(COLORS.green)} onClick={savePrices}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreOrders({ preOrders, dealers, products, loadAll, getDealerName }) {
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
    setDetail(null); loadAll()
    alert('Siparis olusturuldu: ' + orderId)
  }

  const STATUS = { on_siparis: { label: 'On Siparis', color: COLORS.orange }, siparise_donustu: { label: 'Siparise Donustu', color: COLORS.green }, iptal: { label: 'Iptal', color: '#aaa' } }

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 20 }}>On Siparisler</h2>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={S.th}>No</th><th style={S.th}>Bayi</th><th style={S.th}>Okul</th><th style={S.th}>Sezon</th><th style={S.th}>Toplam</th><th style={S.th}>Durum</th><th style={S.th}></th></tr></thead>
          <tbody>{preOrders.length === 0 ? (
            <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 32 }}>On siparis yok</td></tr>
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
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ ...S.btn(COLORS.teal), fontSize: 11, padding: '5px 10px' }} onClick={() => setDetail(po)}>Detay</button>
                    {po.status === 'on_siparis' && <button style={{ ...S.btn(COLORS.green), fontSize: 11, padding: '5px 10px' }} onClick={() => convertToOrder(po)}>Siparise Donustur</button>}
                  </div>
                </td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
      {detail && (
        <div style={S.modal} onClick={() => setDetail(null)}>
          <div style={{ ...S.modalBox, width: 640 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: COLORS.primary }}>On Siparis Detayi</h3>
              <button style={S.btn('#aaa')} onClick={() => setDetail(null)}>Kapat</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, background: '#f8f4ff', borderRadius: 10, padding: 14 }}>
              <div><span style={{ fontSize: 11, color: '#888' }}>BAYI</span><div style={{ fontWeight: 700 }}>{getDealerName(detail.dealer_id)}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>OKUL</span><div style={{ fontWeight: 700 }}>{detail.school_name}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>SEZON</span><div style={{ fontWeight: 700 }}>{detail.season}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>ADRES</span><div style={{ fontWeight: 700 }}>{detail.address || '-'}</div></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={S.th}>Urun</th><th style={S.th}>Adet</th><th style={S.th}>Birim Fiyat</th><th style={S.th}>Toplam</th></tr></thead>
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
            {detail.status === 'on_siparis' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button style={S.btn(COLORS.green)} onClick={() => convertToOrder(detail)}>Siparise Donustur</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Orders({ dealers, orders, products, loadAll, getDealerName }) {
  const [modal, setModal] = useState(false)
  const [processModal, setProcessModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [classItems, setClassItems] = useState([{ grade: '1. Sinif', branch: '', teacher: '', qty: '' }])
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
    // Mevcut sinif dagilimini yukle
    const { data } = await supabase.from('order_class_items').select('*').eq('order_id', order.id)
    if (data && data.length > 0) {
      setClassItems(data.map(d => ({ grade: d.grade, branch: d.branch, teacher: d.teacher, qty: d.qty })))
    } else {
      setClassItems([{ grade: '1. Sinif', branch: '', teacher: '', qty: '' }])
    }
    setProcessModal(true)
  }

  const addClassItem = () => setClassItems(prev => [...prev, { grade: '1. Sinif', branch: '', teacher: '', qty: '' }])
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

    // Sinif dagilimini kaydet
    await supabase.from('order_class_items').delete().eq('order_id', selectedOrder.id)
    const validItems = classItems.filter(i => i.grade && parseInt(i.qty) > 0)
    if (validItems.length > 0) {
      await supabase.from('order_class_items').insert(validItems.map(i => ({
        order_id: selectedOrder.id, grade: i.grade, branch: i.branch, teacher: i.teacher, qty: parseInt(i.qty)
      })))
    }
    setProcessModal(false); loadAll()
  }

  const save = async () => {
    if (!form.dealer_id || !form.product_id || !form.qty) return
    const orderId = 'SIP-' + Date.now().toString().slice(-6)
    await supabase.from('orders').insert([{ id: orderId, dealer_id: form.dealer_id, school_name: form.school_name, season: form.season, total, cargo_fee: parseFloat(form.cargo_fee) || 0, cargo_date: form.cargo_date || null, cargo_status: 'faturalanmadi', invoice_status: form.invoice_status, dia_status: form.dia_status, note: form.note, status: 'beklemede' }])
    await supabase.from('order_items').insert([{ order_id: orderId, product_id: parseInt(form.product_id), qty: parseInt(form.qty), unit_price: parseFloat(form.unit_price), free_qty: parseInt(form.free_qty) || 0 }])
    const dealer = dealers.find(d => d.id === form.dealer_id)
    await supabase.from('dealers').update({ balance: (dealer?.balance || 0) - total }).eq('id', form.dealer_id)
    setModal(false)
    setForm({ dealer_id: '', school_name: '', season: '2026-2027', product_id: '', qty: '', unit_price: '', free_qty: 0, cargo_fee: '', cargo_date: '', invoice_status: 'kesilmedi', dia_status: false, note: '' })
    loadAll()
  }

  const updateField = async (id, field, value) => {
    await supabase.from('orders').update({ [field]: value }).eq('id', id)
    loadAll()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: COLORS.primary }}>Siparisler</h2>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Siparis Ekle</button>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  <option value="hazirlaniyor">Hazirlaniyor</option>
                  <option value="yolda">Yolda</option>
                  <option value="teslim_edildi">Teslim Edildi</option>
                  <option value="iptal">Iptal</option>
                </select>
              </td>
              <td style={S.td}>{fmtDate(o.cargo_date)}</td>
              <td style={S.td}><span style={S.badge(o.invoice_status === 'kesildi' ? COLORS.green : COLORS.orange)}>{o.invoice_status}</span></td>
              <td style={S.td}><span style={S.badge(o.dia_status ? COLORS.green : '#aaa')}>{o.dia_status ? 'Islendi' : 'Islenmedi'}</span></td>
              <td style={S.td}>
                <button style={{ ...S.btn(COLORS.teal), fontSize: 11, padding: '5px 10px' }} onClick={() => openProcess(o)}>Isleme Al</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* İşleme Al Modalı */}
      {processModal && selectedOrder && (
        <div style={S.modal} onClick={() => setProcessModal(false)}>
          <div style={{ ...S.modalBox, width: 720 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 4 }}>Siparisi Isleme Al</h3>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>{selectedOrder.id} — {getDealerName(selectedOrder.dealer_id)} / {selectedOrder.school_name}</div>

            {/* Sevk Bilgileri */}
            <div style={{ background: '#f8f4ff', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>SEVK BILGILERI</div>
              <div style={S.grid2}>
                <div><label style={S.label}>Sevk Tarihi</label><input type="date" style={S.input} value={processForm.cargo_date} onChange={e => setProcessForm(p => ({ ...p, cargo_date: e.target.value }))} /></div>
                <div><label style={S.label}>Kargo Tutari</label><input type="number" style={S.input} value={processForm.cargo_fee} onChange={e => setProcessForm(p => ({ ...p, cargo_fee: e.target.value }))} /></div>
                <div><label style={S.label}>Ucretsiz Set Adedi</label><input type="number" style={S.input} value={processForm.free_qty} onChange={e => setProcessForm(p => ({ ...p, free_qty: e.target.value }))} /></div>
                <div><label style={S.label}>Kargo Durumu</label>
                  <select style={S.select} value={processForm.cargo_status} onChange={e => setProcessForm(p => ({ ...p, cargo_status: e.target.value }))}>
                    <option value="faturalanmadi">Faturalanmadi</option>
                    <option value="odendi">Odendi</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sınıf Dağılımı */}
            <div style={{ background: '#f0fff4', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green }}>SINIF DAGILIMI</div>
                <button style={{ ...S.btn(COLORS.green), fontSize: 11, padding: '4px 10px' }} onClick={addClassItem}>+ Satir Ekle</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={{ ...S.th, width: 140 }}>Sinif Seviyesi</th>
                  <th style={{ ...S.th, width: 80 }}>Sube</th>
                  <th style={S.th}>Sorumlu Ogretmen</th>
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
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>FATURA & DIA BILGILERI</div>
              <div style={S.grid2}>
                <div><label style={S.label}>Fatura Durumu</label>
                  <select style={S.select} value={processForm.invoice_status} onChange={e => setProcessForm(p => ({ ...p, invoice_status: e.target.value }))}>
                    <option value="kesilmedi">Kesilmedi</option>
                    <option value="kesildi">Kesildi</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input type="checkbox" id="dia_proc" checked={processForm.dia_status} onChange={e => setProcessForm(p => ({ ...p, dia_status: e.target.checked }))} />
                  <label htmlFor="dia_proc" style={{ fontSize: 13, fontWeight: 600 }}>Dia'ya Islendi</label>
                </div>
                <div><label style={S.label}>Dia Cari Kodu</label><input style={S.input} value={processForm.dia_cari_kodu} onChange={e => setProcessForm(p => ({ ...p, dia_cari_kodu: e.target.value }))} placeholder="CARI-001" /></div>
                <div><label style={S.label}>Dia Fatura No</label><input style={S.input} value={processForm.dia_fatura_no} onChange={e => setProcessForm(p => ({ ...p, dia_fatura_no: e.target.value }))} placeholder="FTR-2026-001" /></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={S.btn('#aaa')} onClick={() => setProcessModal(false)}>Iptal</button>
              <button style={S.btn(COLORS.green)} onClick={saveProcess}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div style={S.modal} onClick={() => setModal(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 20 }}>Yeni Siparis</h3>
            <div style={S.grid2}>
              <div><label style={S.label}>Bayi</label><select style={S.select} value={form.dealer_id} onChange={e => setForm(p => ({ ...p, dealer_id: e.target.value }))}><option value="">Seciniz...</option>{dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label style={S.label}>Okul</label><input style={S.input} value={form.school_name} onChange={e => setForm(p => ({ ...p, school_name: e.target.value }))} /></div>
              <div><label style={S.label}>Urun</label><select style={S.select} value={form.product_id} onChange={e => setForm(p => ({ ...p, product_id: e.target.value }))}><option value="">Seciniz...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label style={S.label}>Sezon</label><select style={S.select} value={form.season} onChange={e => setForm(p => ({ ...p, season: e.target.value }))}><option>2024-2025</option><option>2025-2026</option><option>2026-2027</option></select></div>
              <div><label style={S.label}>Adet</label><input type="number" style={S.input} value={form.qty} onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} /></div>
              <div><label style={S.label}>Birim Fiyat</label><input type="number" style={S.input} value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} /></div>
              <div><label style={S.label}>Ucretsiz Adet</label><input type="number" style={S.input} value={form.free_qty} onChange={e => setForm(p => ({ ...p, free_qty: e.target.value }))} /></div>
              <div><label style={S.label}>Kargo Tutari</label><input type="number" style={S.input} value={form.cargo_fee} onChange={e => setForm(p => ({ ...p, cargo_fee: e.target.value }))} /></div>
              <div><label style={S.label}>Sevk Tarihi</label><input type="date" style={S.input} value={form.cargo_date} onChange={e => setForm(p => ({ ...p, cargo_date: e.target.value }))} /></div>
              <div><label style={S.label}>Fatura</label><select style={S.select} value={form.invoice_status} onChange={e => setForm(p => ({ ...p, invoice_status: e.target.value }))}><option value="kesilmedi">Kesilmedi</option><option value="kesildi">Kesildi</option></select></div>
            </div>
            <div style={{ marginTop: 14 }}><label style={S.label}>Not</label><input style={S.input} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} /></div>
            <div style={{ background: '#f8f4ff', borderRadius: 10, padding: 12, marginTop: 14, textAlign: 'right' }}>
              <span style={{ fontSize: 13, color: '#888' }}>Toplam: </span>
              <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary }}>{fmt(total)}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btn('#aaa')} onClick={() => setModal(false)}>Iptal</button>
              <button style={S.btn()} onClick={save}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Payments({ dealers, payments, loadAll }) {
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
    setModal(false)
    setForm({ dealer_id: '', amount: '', method: 'havale', commission_rate: '', note: '' })
    loadAll()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: COLORS.primary }}>Odemeler</h2>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Odeme Ekle</button>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={S.th}>No</th><th style={S.th}>Bayi</th><th style={S.th}>Tarih</th><th style={S.th}>Yontem</th><th style={S.th}>Tutar</th><th style={S.th}>Not</th></tr></thead>
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
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 20 }}>Odeme Ekle</h3>
            <div style={S.grid2}>
              <div><label style={S.label}>Bayi</label><select style={S.select} value={form.dealer_id} onChange={e => setForm(p => ({ ...p, dealer_id: e.target.value }))}><option value="">Seciniz...</option>{dealers.map(d => <option key={d.id} value={d.id}>{d.name} ({fmt(d.balance)})</option>)}</select></div>
              <div><label style={S.label}>Yontem</label><select style={S.select} value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}><option value="havale">Havale/EFT</option><option value="nakit">Nakit</option><option value="kredi_karti">Kredi Karti</option></select></div>
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
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btn('#aaa')} onClick={() => setModal(false)}>Iptal</button>
              <button style={S.btn(COLORS.green)} onClick={save}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Checks({ dealers, checks, loadAll }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ dealer_id: '', amount: '', due_date: '', status: 'musteride', bank: '', note: '' })
  const STATUS = { musteride: { label: 'Musteride', color: COLORS.orange }, portfolyde: { label: 'Portfolyde', color: COLORS.teal }, tedarikcide: { label: 'Tedarikcide', color: COLORS.primary }, tahsil_edildi: { label: 'Tahsil Edildi', color: COLORS.green } }

  const save = async () => {
    if (!form.dealer_id || !form.amount || !form.due_date) return
    await supabase.from('checks').insert([{ ...form, amount: parseFloat(form.amount) }])
    const payId = 'CEK-' + Date.now().toString().slice(-6)
    await supabase.from('payments').insert([{ id: payId, dealer_id: form.dealer_id, amount: parseFloat(form.amount), method: 'cek', note: 'Vade: ' + form.due_date + (form.bank ? ' / ' + form.bank : '') }])
    const dealer = dealers.find(d => d.id === form.dealer_id)
    await supabase.from('dealers').update({ balance: (dealer?.balance || 0) + parseFloat(form.amount) }).eq('id', form.dealer_id)
    setModal(false)
    setForm({ dealer_id: '', amount: '', due_date: '', status: 'musteride', bank: '', note: '' })
    loadAll()
  }

  const updateStatus = async (id, status) => {
    await supabase.from('checks').update({ status }).eq('id', id)
    loadAll()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: COLORS.primary }}>Cekler</h2>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Cek Ekle</button>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 20 }}>Cek Ekle</h3>
            <div style={S.grid2}>
              <div><label style={S.label}>Bayi</label><select style={S.select} value={form.dealer_id} onChange={e => setForm(p => ({ ...p, dealer_id: e.target.value }))}><option value="">Seciniz...</option>{dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label style={S.label}>Tutar</label><input type="number" style={S.input} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
              <div><label style={S.label}>Vade Tarihi</label><input type="date" style={S.input} value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              <div><label style={S.label}>Banka</label><input style={S.input} value={form.bank} onChange={e => setForm(p => ({ ...p, bank: e.target.value }))} /></div>
              <div><label style={S.label}>Durum</label><select style={S.select} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            </div>
            <div style={{ marginTop: 14 }}><label style={S.label}>Not</label><input style={S.input} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} /></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btn('#aaa')} onClick={() => setModal(false)}>Iptal</button>
              <button style={S.btn()} onClick={save}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Products({ products, loadAll }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', sku: '', box_size: '', default_price: '' })

  const save = async () => {
    if (!form.name) return
    await supabase.from('products').insert([{ ...form, box_size: parseInt(form.box_size) || 0, default_price: parseFloat(form.default_price) || 0 }])
    setModal(false)
    setForm({ name: '', sku: '', box_size: '', default_price: '' })
    loadAll()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: COLORS.primary }}>Urunler</h2>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Urun Ekle</button>
      </div>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={S.th}>SKU</th><th style={S.th}>Urun Adi</th><th style={S.th}>Kutu Ici</th><th style={S.th}>Varsayilan Fiyat</th></tr></thead>
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
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: COLORS.primary, marginBottom: 20 }}>Yeni Urun</h3>
            <div style={S.grid2}>
              <div><label style={S.label}>Urun Adi</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label style={S.label}>SKU</label><input style={S.input} value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} /></div>
              <div><label style={S.label}>Kutu Ici</label><input type="number" style={S.input} value={form.box_size} onChange={e => setForm(p => ({ ...p, box_size: e.target.value }))} /></div>
              <div><label style={S.label}>Varsayilan Fiyat</label><input type="number" style={S.input} value={form.default_price} onChange={e => setForm(p => ({ ...p, default_price: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={S.btn('#aaa')} onClick={() => setModal(false)}>Iptal</button>
              <button style={S.btn()} onClick={save}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}