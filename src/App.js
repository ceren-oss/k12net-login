import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'
import AdminPanel from './AdminPanel'
import DealerPortal from './DealerPortal'

export default function App() {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const adminSession = localStorage.getItem('admin_session')
    if (adminSession) { setIsAdmin(true); setLoading(false); return }
    const dealerSession = localStorage.getItem('dealer_session')
    if (dealerSession) { setSession(JSON.parse(dealerSession)); setLoading(false); return }
    setLoading(false)
  }, [])

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#8C479C'}}>Yükleniyor...</div>
  if (isAdmin) return <AdminPanel onLogout={() => { localStorage.removeItem('admin_session'); setIsAdmin(false) }} />
  if (session) return <DealerApp dealer={session} onLogout={() => { localStorage.removeItem('dealer_session'); setSession(null) }} />
  return <LoginPage onAdminLogin={() => { localStorage.setItem('admin_session', 'true'); setIsAdmin(true) }} onDealerLogin={(d) => { localStorage.setItem('dealer_session', JSON.stringify(d)); setSession(d) }} />
}

function LoginPage({ onAdminLogin, onDealerLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    if (username === 'admin' && password === 'kesif2024') { onAdminLogin(); return }
    const { data, error } = await supabase.from('dealers').select('*').eq('username', username).eq('password_hash', password).single()
    if (error || !data) { setError('Kullanici adi veya sifre hatali!'); setLoading(false); return }
    onDealerLogin(data)
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#f8f4ff 0%,#e8f7f7 100%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:20,padding:40,width:380,boxShadow:'0 20px 60px rgba(140,71,156,0.15)'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:8}}>🔬</div>
          <div style={{fontSize:24,fontWeight:800,color:'#8C479C'}}>Kesif Kutusu</div>
          <div style={{fontSize:13,color:'#aaa',marginTop:4}}>Bayi Portali</div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,fontWeight:600,color:'#666',display:'block',marginBottom:6}}>KULLANICI ADI</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="kullanici adi" style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'2px solid #f0e8ff',fontSize:14,outline:'none',boxSizing:'border-box'}} />
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:12,fontWeight:600,color:'#666',display:'block',marginBottom:6}}>SIFRE</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="••••••••" style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'2px solid #f0e8ff',fontSize:14,outline:'none',boxSizing:'border-box'}} />
        </div>
        {error && <div style={{background:'#fff0f0',color:'#e55',borderRadius:8,padding:'10px 14px',fontSize:13,marginBottom:16}}>{error}</div>}
        <button onClick={handleLogin} disabled={loading} style={{width:'100%',padding:'13px',borderRadius:10,background:'linear-gradient(135deg,#8C479C,#60CDCB)',color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer'}}>
          {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
        </button>
      </div>
    </div>
  )
}

function DealerApp({ dealer, onLogout }) {
  return <DealerPortal dealer={dealer} onLogout={onLogout} />
}