import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const COLORS = {
  primary: '#8C479C', yellow: '#FCC400', teal: '#60CDCB',
  green: '#86B535', orange: '#EC6A34', pink: '#D7508B', bg: '#f8f4ff',
}

const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-'

const S = {
  header: { background: COLORS.primary, padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  nav: { background: '#7a3d88', display: 'flex', padding: '0 28px' },
  navItem: (active) => ({ padding: '12px 16px', cursor: 'pointer', color: active ? '#FCC400' : 'rgba(255,255,255,0.7)', fontWeight: active ? 700 : 400, fontSize: 14, borderBottom: active ? '3px solid #FCC400' : '3px solid transparent' }),
  main: { padding: '28px 32px', background: COLORS.bg, minHeight: '100vh' },
  card: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(140,71,156,0.08)', marginBottom: 16 },
  btn: (color) => ({ padding: '9px 18px', borderRadius: 9, background: color || COLORS.primary, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }),
  input: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '2px solid #f0e8ff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', padding: '10px 12px', borderRadius: 9, border: '2px solid #f0e8ff', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' },
  label: { fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', padding: '10px 12px', borderBottom: '2px solid #f0e8ff' },
  td: { padding: '11px 12px', fontSize: 13, color: '#333', borderBottom: '1px solid #f9f0ff' },
  badge: (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + '22', color: color }),
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modalBox: { background: '#fff', borderRadius: 16, padding: 28, width: 580, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' },
}

export default function DealerPortal({ dealer, onLogout }) {
  const [page, setPage] = useState('dashboard')
  const [orders, setOrders] = useState([])
  const [preOrders, setPreOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [checks, setChecks] = useState([])
  const [products, setProducts] = useState([])
  const [dealerPrices, setDealerPrices] = useState([])

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [o, po, p, c, pr, dp] = await Promise.all([
      supabase.from('orders').select('*').eq('dealer_id', dealer.id).order('created_at', { ascending: false }),
      supabase.from('pre_orders').select('*, pre_order_items(*)').eq('dealer_id', dealer.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('dealer_id', dealer.id).order('created_at', { ascending: false }),
      supabase.from('checks').select('*').eq('dealer_id', dealer.id).order('due_date'),
      supabase.from('products').select('*').order('id'),
      supabase.from('dealer_prices').select('*').eq('dealer_id', dealer.id),
    ])
    if (o.data) setOrders(o.data)
    if (po.data) setPreOrders(po.data)
    if (p.data) setPayments(p.data)
    if (c.data) setChecks(c.data)
    if (pr.data) setProducts(pr.data)
    if (dp.data) setDealerPrices(dp.data)
  }

  const getPrice = (productId) => {
    const dp = dealerPrices.find(p => p.product_id === productId)
    if (dp) return dp.price
    const prod = products.find(p => p.id === productId)
    return prod?.default_price || 0
  }

  const confirmPreOrder = async (po) => {
    if (!window.confirm(po.school_name + ' on siparisi kesinlestirilsin mi?')) return
    const items = po.pre_order_items || []
    const total = items.reduce((s, i) => s + ((i.qty || 0) * (i.unit_price || 0)), 0)
    const orderId = 'SIP-' + Date.now().toString().slice(-6)
    await supabase.from('orders').insert([{
      id: orderId, dealer_id: dealer.id, school_name: po.school_name,
      season: po.season, total, invoice_status: 'kesilmedi',
      dia_status: false, cargo_status: 'faturalanmadi', note: po.note, status: 'beklemede'
    }])
    for (const item of items) {
      await supabase.from('order_items').insert([{
        order_id: orderId, product_id: item.product_id,
        qty: item.qty, unit_price: item.unit_price, free_qty: 0
      }])
    }
    const { data: freshDealer } = await supabase.from('dealers').select('balance').eq('id', dealer.id).single()
    await supabase.from('dealers').update({ balance: (freshDealer?.balance || 0) - total }).eq('id', dealer.id)
    await supabase.from('pre_orders').update({ status: 'siparise_donustu' }).eq('id', po.id)
    loadAll()
    alert('Siparisimiz alindi! Siparis No: ' + orderId)
  }

  const NAV = [
    { id: 'dashboard', label: 'Ozet' },
    { id: 'preorder', label: 'On Siparis Ver' },
    { id: 'preorders', label: 'On Siparislerim' },
    { id: 'orders', label: 'Siparislerim' },
    { id: 'payments', label: 'Odemelerim' },
    { id: 'checks', label: 'Ceklerim' },
  ]

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28 }}>🔬</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Kesif Kutusu</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Bayi Portali</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{dealer.name}</div>
            <div style={{ fontSize: 12, color: (dealer.balance || 0) < 0 ? '#ffb3b3' : '#b3ffb3' }}>Bakiye: {fmt(dealer.balance)}</div>
          </div>
          <button onClick={onLogout} style={{ ...S.btn('rgba(255,255,255,0.2)'), fontSize: 12 }}>Cikis</button>
        </div>
      </div>
      <div style={S.nav}>
        {NAV.map(n => <div key={n.id} style={S.navItem(page === n.id)} onClick={() => setPage(n.id)}>{n.label}</div>)}
      </div>
      <div style={S.main}>
        {page === 'dashboard' && <Dashboard dealer={dealer} orders={orders} payments={payments} checks={checks} preOrders={preOrders} />}
        {page === 'preorder' && <PreOrder dealer={dealer} products={products} getPrice={getPrice} loadAll={loadAll} />}
        {page === 'preorders' && <PreOrders preOrders={preOrders} products={products} confirmPreOrder={confirmPreOrder} />}
        {page === 'orders' && <Orders orders={orders} />}
        {page === 'payments' && <PaymentsView payments={payments} checks={checks} />}
        {page === 'checks' && <ChecksView checks={checks} />}
      </div>
    </div>
  )
}

function Dashboard({ dealer, orders, payments, checks, preOrders }) {
  const pendingChecks = checks.filter(c => c.status !== 'tahsil_edildi')
  const pendingPreOrders = preOrders.filter(p => p.status === 'on_siparis')

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 20 }}>Hos geldiniz, {dealer.contact || dealer.name}!</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ ...S.card, borderTop: '4px solid ' + COLORS.primary, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Bakiye</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: (dealer.balance || 0) < 0 ? COLORS.orange : COLORS.green, marginTop: 4 }}>{fmt(dealer.balance)}</div>
        </div>
        <div style={{ ...S.card, borderTop: '4px solid ' + COLORS.teal, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Toplam Siparis</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.teal, marginTop: 4 }}>{orders.length}</div>
        </div>
        <div style={{ ...S.card, borderTop: '4px solid ' + COLORS.yellow, marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Bekleyen Cek</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.yellow, marginTop: 4 }}>{pendingChecks.length} adet</div>
        </div>
      </div>
      {pendingPreOrders.length > 0 && (
        <div style={{ ...S.card, borderLeft: '4px solid ' + COLORS.orange }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.orange, marginBottom: 8 }}>⏳ Kesinlesmemis On Siparisleriniz</div>
          {pendingPreOrders.map(po => (
            <div key={po.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0e8ff' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{po.school_name}</span>
              <span style={S.badge(COLORS.orange)}>Bekliyor</span>
            </div>
          ))}
        </div>
      )}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>Son Siparisler</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={S.th}>Okul</th><th style={S.th}>Sezon</th><th style={S.th}>Tutar</th><th style={S.th}>Fatura</th></tr></thead>
          <tbody>{orders.slice(0, 5).map(o => (
            <tr key={o.id}>
              <td style={S.td}>{o.school_name || '-'}</td>
              <td style={S.td}>{o.season}</td>
              <td style={S.td}><strong>{fmt(o.total)}</strong></td>
              <td style={S.td}><span style={S.badge(o.invoice_status === 'kesildi' ? COLORS.green : COLORS.orange)}>{o.invoice_status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function PreOrder({ dealer, products, getPrice, loadAll }) {
  const [schoolName, setSchoolName] = useState('')
  const [address, setAddress] = useState('')
  const [season, setSeason] = useState('2026-2027')
  const [note, setNote] = useState('')
  const [items, setItems] = useState([{ product_id: '', qty: '', unit_price: 0 }])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const updateItem = (idx, field, value) => {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      if (field === 'product_id') next[idx].unit_price = getPrice(parseInt(value))
      return next
    })
  }

  const addItem = () => setItems(prev => [...prev, { product_id: '', qty: '', unit_price: 0 }])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const total = items.reduce((s, i) => s + ((parseInt(i.qty) || 0) * (i.unit_price || 0)), 0)
  const filledItems = items.filter(i => i.product_id && parseInt(i.qty) > 0)

  const save = async () => {
    if (!schoolName || filledItems.length === 0) return
    setLoading(true)
    const preOrderId = 'ON-' + Date.now().toString().slice(-6)
    await supabase.from('pre_orders').insert([{ id: preOrderId, dealer_id: dealer.id, school_name: schoolName, address, season, note, status: 'on_siparis' }])
    await supabase.from('pre_order_items').insert(filledItems.map(i => ({
      pre_order_id: preOrderId, grade: '-', branch: '-', teacher: '-',
      product_id: parseInt(i.product_id), qty: parseInt(i.qty), unit_price: i.unit_price,
    })))
    setSubmitted(true)
    setLoading(false)
    setSchoolName(''); setAddress(''); setNote('')
    setItems([{ product_id: '', qty: '', unit_price: 0 }])
    loadAll()
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 20 }}>On Siparis Ver</h2>
      {submitted && (
        <div style={{ background: COLORS.green + '22', border: '2px solid ' + COLORS.green, borderRadius: 10, padding: 16, marginBottom: 20, color: COLORS.green, fontWeight: 700, textAlign: 'center' }}>
          On siparisimiz alindi! On Siparislerim bolumunden kesinlestirebilirsiniz.
        </div>
      )}
      <div style={S.card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>Kurum Bilgileri</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label style={S.label}>Kurum Adi *</label><input style={S.input} value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="Okul / Kurum adi" /></div>
          <div><label style={S.label}>Sezon</label><select style={S.select} value={season} onChange={e => setSeason(e.target.value)}><option>2025-2026</option><option>2026-2027</option></select></div>
        </div>
        <div><label style={S.label}>Adres</label><input style={S.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="Kurum adresi" /></div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 16 }}>Urun ve Adet Bilgileri</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: COLORS.primary + '11' }}>
              <th style={S.th}>Urun</th>
              <th style={{ ...S.th, width: 120 }}>Birim Fiyat</th>
              <th style={{ ...S.th, width: 100 }}>Toplam Adet</th>
              <th style={{ ...S.th, width: 120 }}>Toplam</th>
              <th style={{ ...S.th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#faf6ff' }}>
                <td style={S.td}>
                  <select style={S.select} value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                    <option value="">Urun seciniz...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>
                  {item.unit_price > 0 ? fmt(item.unit_price) : '-'}
                </td>
                <td style={S.td}>
                  <input type="number" min="0" style={{ ...S.input, textAlign: 'center' }} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} placeholder="0" />
                </td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: (parseInt(item.qty) || 0) > 0 ? COLORS.primary : '#ccc' }}>
                  {(parseInt(item.qty) || 0) > 0 ? fmt((parseInt(item.qty) || 0) * (item.unit_price || 0)) : '-'}
                </td>
                <td style={S.td}>
                  {idx > 0 && <button style={{ ...S.btn('#ef4444'), padding: '4px 8px', fontSize: 12 }} onClick={() => removeItem(idx)}>✕</button>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: COLORS.primary + '11' }}>
              <td colSpan={3} style={{ ...S.td, fontWeight: 800, textAlign: 'right', color: COLORS.primary }}>GENEL TOPLAM:</td>
              <td style={{ ...S.td, fontWeight: 800, fontSize: 16, color: COLORS.primary, textAlign: 'right' }}>{fmt(total)}</td>
              <td style={S.td}></td>
            </tr>
          </tfoot>
        </table>
        <div style={{ marginTop: 12 }}>
          <button style={{ ...S.btn(COLORS.teal), fontSize: 12 }} onClick={addItem}>+ Urun Ekle</button>
        </div>
      </div>

      <div style={S.card}>
        <label style={S.label}>Not</label>
        <input style={S.input} value={note} onChange={e => setNote(e.target.value)} placeholder="Varsa eklemek istediginiz not..." />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={S.btn(COLORS.primary)} onClick={save} disabled={loading || !schoolName || filledItems.length === 0}>
          {loading ? 'Gonderiliyor...' : 'On Siparis Gonder'}
        </button>
      </div>
    </div>
  )
}

function PreOrders({ preOrders, products, confirmPreOrder }) {
  const [detail, setDetail] = useState(null)
  const STATUS = {
    on_siparis: { label: 'Kesinlestirilmedi', color: COLORS.orange },
    siparise_donustu: { label: 'Kesinlesti', color: COLORS.green },
    iptal: { label: 'Iptal', color: '#aaa' }
  }

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 20 }}>On Siparislerim</h2>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={S.th}>No</th><th style={S.th}>Okul</th><th style={S.th}>Sezon</th><th style={S.th}>Toplam</th><th style={S.th}>Durum</th><th style={S.th}></th>
          </tr></thead>
          <tbody>{preOrders.length === 0 ? (
            <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 32 }}>On siparis yok</td></tr>
          ) : preOrders.map(po => {
            const items = po.pre_order_items || []
            const total = items.reduce((s, i) => s + ((i.qty || 0) * (i.unit_price || 0)), 0)
            return (
              <tr key={po.id}>
                <td style={S.td}><strong style={{ color: COLORS.primary }}>{po.id}</strong></td>
                <td style={S.td}><strong>{po.school_name}</strong></td>
                <td style={S.td}>{po.season}</td>
                <td style={S.td}><strong>{fmt(total)}</strong></td>
                <td style={S.td}><span style={S.badge(STATUS[po.status]?.color || '#aaa')}>{STATUS[po.status]?.label}</span></td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ ...S.btn(COLORS.teal), fontSize: 11, padding: '5px 10px' }} onClick={() => setDetail(po)}>Detay</button>
                    {po.status === 'on_siparis' && (
                      <button style={{ ...S.btn(COLORS.green), fontSize: 11, padding: '5px 10px' }} onClick={() => confirmPreOrder(po)}>Kesinlestir</button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>

      {detail && (
        <div style={S.modal} onClick={() => setDetail(null)}>
          <div style={{ ...S.modalBox, width: 600 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: COLORS.primary }}>On Siparis Detayi</h3>
              <button style={S.btn('#aaa')} onClick={() => setDetail(null)}>Kapat</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, background: '#f8f4ff', borderRadius: 10, padding: 14 }}>
              <div><span style={{ fontSize: 11, color: '#888' }}>OKUL</span><div style={{ fontWeight: 700 }}>{detail.school_name}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>SEZON</span><div style={{ fontWeight: 700 }}>{detail.season}</div></div>
              <div><span style={{ fontSize: 11, color: '#888' }}>ADRES</span><div style={{ fontWeight: 700 }}>{detail.address || '-'}</div></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={S.th}>Urun</th><th style={S.th}>Adet</th><th style={S.th}>Birim Fiyat</th><th style={S.th}>Toplam</th>
              </tr></thead>
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
                <button style={S.btn(COLORS.green)} onClick={() => { confirmPreOrder(detail); setDetail(null) }}>Siparisi Kesinlestir</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Orders({ orders }) {
  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 20 }}>Siparislerim</h2>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={S.th}>Siparis No</th><th style={S.th}>Okul</th><th style={S.th}>Sezon</th><th style={S.th}>Tutar</th><th style={S.th}>Sevk</th><th style={S.th}>Fatura</th><th style={S.th}>Dia</th>
          </tr></thead>
          <tbody>{orders.length === 0 ? (
            <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 32 }}>Henuz siparis yok</td></tr>
          ) : orders.map(o => (
            <tr key={o.id}>
              <td style={S.td}><strong style={{ color: COLORS.primary }}>{o.id}</strong></td>
              <td style={S.td}>{o.school_name || '-'}</td>
              <td style={S.td}>{o.season}</td>
              <td style={S.td}><strong>{fmt(o.total)}</strong></td>
              <td style={S.td}>{o.cargo_date ? new Date(o.cargo_date).toLocaleDateString('tr-TR') : '-'}</td>
              <td style={S.td}><span style={S.badge(o.invoice_status === 'kesildi' ? COLORS.green : COLORS.orange)}>{o.invoice_status}</span></td>
              <td style={S.td}><span style={S.badge(o.dia_status ? COLORS.green : '#aaa')}>{o.dia_status ? 'Islendi' : 'Islenmedi'}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function PaymentsView({ payments, checks }) {
  const CHECK_STATUS = {
    musteride: { label: 'Musteride', color: '#f59e0b' },
    portfolyde: { label: 'Portfolyde', color: '#60CDCB' },
    tedarikcide: { label: 'Tedarikcide', color: '#8C479C' },
    tahsil_edildi: { label: 'Tahsil Edildi', color: '#86B535' }
  }
  const cashPayments = payments.filter(p => p.method !== 'cek')

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 20 }}>Odemelerim</h2>
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>Nakit / Havale Odemeler</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={S.th}>Tarih</th><th style={S.th}>Yontem</th><th style={S.th}>Tutar</th><th style={S.th}>Not</th></tr></thead>
          <tbody>{cashPayments.length === 0 ? (
            <tr><td colSpan={4} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 24 }}>Kayit yok</td></tr>
          ) : cashPayments.map(p => (
            <tr key={p.id}>
              <td style={S.td}>{new Date(p.date).toLocaleDateString('tr-TR')}</td>
              <td style={S.td}><span style={S.badge(COLORS.teal)}>{p.method}</span></td>
              <td style={S.td}><strong style={{ color: COLORS.green }}>{fmt(p.amount)}</strong></td>
              <td style={S.td}>{p.note || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>Cek Odemeler</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={S.th}>Vade</th><th style={S.th}>Tutar</th><th style={S.th}>Banka</th><th style={S.th}>Durum</th></tr></thead>
          <tbody>{checks.length === 0 ? (
            <tr><td colSpan={4} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 24 }}>Kayit yok</td></tr>
          ) : checks.map(c => (
            <tr key={c.id}>
              <td style={S.td}>{new Date(c.due_date).toLocaleDateString('tr-TR')}</td>
              <td style={S.td}><strong style={{ color: COLORS.green }}>{fmt(c.amount)}</strong></td>
              <td style={S.td}>{c.bank || '-'}</td>
              <td style={S.td}><span style={S.badge(CHECK_STATUS[c.status]?.color || '#aaa')}>{CHECK_STATUS[c.status]?.label || c.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

function ChecksView({ checks }) {
  const CHECK_STATUS = {
    musteride: { label: 'Musteride', color: '#f59e0b' },
    portfolyde: { label: 'Portfolyde', color: '#60CDCB' },
    tedarikcide: { label: 'Tedarikcide', color: '#8C479C' },
    tahsil_edildi: { label: 'Tahsil Edildi', color: '#86B535' }
  }

  return (
    <div>
      <h2 style={{ color: COLORS.primary, marginBottom: 20 }}>Ceklerim</h2>
      <div style={S.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={S.th}>Vade</th><th style={S.th}>Tutar</th><th style={S.th}>Banka</th><th style={S.th}>Durum</th><th style={S.th}>Not</th></tr></thead>
          <tbody>{checks.length === 0 ? (
            <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: 32 }}>Cek kaydi yok</td></tr>
          ) : checks.map(c => (
            <tr key={c.id}>
              <td style={S.td}><strong>{new Date(c.due_date).toLocaleDateString('tr-TR')}</strong></td>
              <td style={S.td}><strong style={{ color: COLORS.green }}>{fmt(c.amount)}</strong></td>
              <td style={S.td}>{c.bank || '-'}</td>
              <td style={S.td}><span style={S.badge(CHECK_STATUS[c.status]?.color || '#aaa')}>{CHECK_STATUS[c.status]?.label || c.status}</span></td>
              <td style={S.td}>{c.note || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}