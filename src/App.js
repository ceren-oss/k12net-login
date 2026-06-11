import { useState, useEffect } from 'react'
import './App.css'
import AdminPanel from './AdminPanel'
import DealerPortal from './DealerPortal'
import SchoolForm from './SchoolForm'
import kesifKutusuLogo from './assets/kesif-kutusu-logo.png'
import loginBg from './assets/login-bg.png'

const DEALER_CACHE_KEY = 'kk_dealer_cache'

const readDealerCache = () => {
  try {
    return JSON.parse(sessionStorage.getItem(DEALER_CACHE_KEY) || 'null')
  } catch {
    return null
  }
}

const writeDealerCache = (dealer) => {
  sessionStorage.setItem(DEALER_CACHE_KEY, JSON.stringify(dealer))
}

const clearDealerCache = () => {
  sessionStorage.removeItem(DEALER_CACHE_KEY)
}

const fetchAuthSession = async () => {
  const res = await fetch('/api/auth/session', { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}

export default function App() {
  const [session, setSession] = useState(null)
  const [adminUser, setAdminUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // URL'den token kontrolü
  const path = window.location.pathname
  const formToken = path.startsWith('/form/') ? path.replace('/form/', '') : null
  const searchParams = new URLSearchParams(window.location.search)
  const resetToken = String(searchParams.get('reset_token') || '')
  const resetUser = String(searchParams.get('user') || '')
  const hasResetParams = Boolean(resetToken && resetUser)

  useEffect(() => {
    const hydrate = async () => {
      if (formToken || hasResetParams) { setLoading(false); return }

      const legacyAdminSession = localStorage.getItem('admin_session')
      if (legacyAdminSession) localStorage.removeItem('admin_session')
      const legacyDealerSession = localStorage.getItem('dealer_session')
      if (legacyDealerSession) {
        localStorage.removeItem('dealer_session')
        try { writeDealerCache(JSON.parse(legacyDealerSession)) } catch {}
      }

      const cachedDealer = readDealerCache()
      if (cachedDealer) setSession(cachedDealer)

      try {
        const authSession = await fetchAuthSession()
        if (!authSession) {
          setIsAdmin(false)
          setSession(null)
          clearDealerCache()
          setLoading(false)
          return
        }
        if (authSession.role === 'admin') {
          setIsAdmin(true)
          setAdminUser(authSession.admin ? { ...authSession.admin, is_superuser: Boolean(authSession.admin.is_superuser) } : { username: 'admin', name: 'Admin', is_superuser: true })
          setSession(null)
          clearDealerCache()
        } else if (authSession.role === 'dealer' && authSession.dealer) {
          setIsAdmin(false)
          setAdminUser(null)
          setSession(authSession.dealer)
          writeDealerCache(authSession.dealer)
        } else {
          setIsAdmin(false)
          setAdminUser(null)
          setSession(null)
          clearDealerCache()
        }
      } catch {
        setIsAdmin(false)
        setAdminUser(null)
        setSession(cachedDealer || null)
      }
      setLoading(false)
    }
    hydrate()
  }, [formToken, hasResetParams])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8C479C' }}>Yükleniyor...</div>

  // Okul form sayfası
  if (formToken) return <SchoolForm token={formToken} />

  if (isAdmin) return <AdminPanel adminUser={adminUser} onLogout={async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    setIsAdmin(false)
    setAdminUser(null)
    setSession(null)
    clearDealerCache()
  }} />

  if (session) return <DealerPortal dealer={session} onLogout={async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    setSession(null)
    setAdminUser(null)
    setIsAdmin(false)
    clearDealerCache()
  }} />

  return <LoginPage resetToken={resetToken} resetUser={resetUser} onResetCompleted={() => {
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }} onLoginSuccess={(authPayload) => {
    if (authPayload.role === 'admin') {
      setIsAdmin(true)
      setAdminUser(authPayload.admin ? { ...authPayload.admin, is_superuser: Boolean(authPayload.admin.is_superuser) } : { username: 'admin', name: 'Admin', is_superuser: true })
      setSession(null)
      clearDealerCache()
      return
    }
    if (authPayload.role === 'dealer' && authPayload.dealer) {
      setIsAdmin(false)
      setAdminUser(null)
      setSession(authPayload.dealer)
      writeDealerCache(authPayload.dealer)
    }
  }} />
}

function LoginPage({ onLoginSuccess, resetToken = '', resetUser = '', onResetCompleted }) {
  const initialMode = (resetToken && resetUser) ? 'reset' : 'login'
  const [mode, setMode] = useState(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetPasswordAgain, setResetPasswordAgain] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  useEffect(() => {
    setMode((resetToken && resetUser) ? 'reset' : 'login')
  }, [resetToken, resetUser])

  useEffect(() => {
    if (!lockedUntil) return undefined
    const timer = setInterval(() => {
      if (Date.now() >= lockedUntil) {
        setLockedUntil(0)
        setError('')
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [lockedUntil])

  const handleLogin = async () => {
    if (mode !== 'login') return
    if (lockedUntil && Date.now() < lockedUntil) {
      const waitSeconds = Math.ceil((lockedUntil - Date.now()) / 1000)
      setError(`Çok fazla hatalı giriş denemesi. ${waitSeconds} sn sonra tekrar deneyin.`)
      return
    }
    setLoading(true)
    setError('')
    if (!String(username || '').trim() || !password) {
      setError('Kullanıcı adı ve şifre zorunludur!')
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (payload.lockedUntil) setLockedUntil(payload.lockedUntil)
        setError(payload.error || 'Giriş başarısız!')
        setLoading(false)
        return
      }
      setLockedUntil(0)
      setLoading(false)
      onLoginSuccess(payload)
    } catch {
      setError('Giriş servisine ulaşılamadı. Lütfen tekrar deneyin.')
      setLoading(false)
    }
  }

  const handlePasswordResetRequest = async () => {
    setForgotError('')
    setForgotMessage('')
    const identifier = String(forgotIdentifier || '').trim()
    if (!identifier) {
      setForgotError('Kullanıcı adı veya e-posta zorunludur.')
      return
    }
    setForgotLoading(true)
    try {
      const res = await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setForgotError(payload.error || 'Sıfırlama maili gönderilemedi.')
      } else {
        setForgotMessage(payload.message || 'Hesap bulunduysa sıfırlama maili gönderilecektir.')
      }
    } catch {
      setForgotError('Sıfırlama servisine ulaşılamadı. Lütfen tekrar deneyin.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handlePasswordResetConfirm = async () => {
    if (!resetToken || !resetUser) {
      setResetError('Sıfırlama bağlantısı geçersiz.')
      return
    }
    setResetError('')
    setResetMessage('')
    if (!resetPassword || !resetPasswordAgain) {
      setResetError('Yeni şifre alanları zorunludur.')
      return
    }
    if (resetPassword !== resetPasswordAgain) {
      setResetError('Yeni şifre ve tekrar alanı aynı olmalıdır.')
      return
    }
    setResetLoading(true)
    try {
      const res = await fetch('/api/auth/password-reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetUser, token: resetToken, new_password: resetPassword }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResetError(payload.error || 'Şifre sıfırlanamadı.')
      } else {
        setResetMessage('Şifre başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.')
        setUsername(resetUser)
        setPassword('')
        setMode('login')
        if (onResetCompleted) onResetCompleted()
      }
    } catch {
      setResetError('Şifre sıfırlama servisine ulaşılamadı.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box', background: 'linear-gradient(135deg, rgba(10,6,45,0.56) 0%, rgba(81,25,121,0.44) 46%, rgba(41,96,167,0.42) 100%)' }}>
        <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: '34px 32px', width: '100%', maxWidth: 420, border: '1px solid rgba(255,255,255,0.65)', boxShadow: '0 28px 80px rgba(11,8,41,0.38)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <img src={kesifKutusuLogo} alt="Keşif Kutusu" style={{ width: '100%', maxWidth: 300, height: 'auto', marginBottom: 14 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6F5CC4', letterSpacing: '1px', textTransform: 'uppercase' }}>Bayi Portalı</div>
          <div style={{ fontSize: 12, color: '#6D6790', marginTop: 6 }}>
            {mode === 'reset' ? 'Yeni şifrenizi belirleyin' : mode === 'forgot' ? 'Şifre sıfırlama bağlantısı alın' : 'Sipariş ve okul form akışına hoş geldiniz'}
          </div>
        </div>
        {mode === 'login' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4E4A67', display: 'block', marginBottom: 6, letterSpacing: '0.4px' }}>KULLANICI ADI</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="kullanıcı adı" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.8px solid #d6cdf6', background: '#ffffffcc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4E4A67', display: 'block', marginBottom: 6, letterSpacing: '0.4px' }}>ŞİFRE</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.8px solid #d6cdf6', background: '#ffffffcc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <button style={{ border: 'none', background: 'transparent', color: '#5d4ec7', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} onClick={() => { setError(''); setForgotError(''); setForgotMessage(''); setMode('forgot') }}>Şifremi Unuttum</button>
            </div>
            {error && <div style={{ background: '#fff0f0', color: '#d54545', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16, border: '1px solid #ffd6d6' }}>{error}</div>}
            {resetMessage && <div style={{ background: '#f0fff4', color: '#1a7f37', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16, border: '1px solid #ccead5' }}>{resetMessage}</div>}
            <button onClick={handleLogin} disabled={loading || (lockedUntil && Date.now() < lockedUntil)} style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#8C479C,#4F66D6,#60CDCB)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 14px 30px rgba(76,83,187,0.35)', opacity: loading ? 0.75 : 1 }}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4E4A67', display: 'block', marginBottom: 6, letterSpacing: '0.4px' }}>KULLANICI ADI VEYA E-POSTA</label>
              <input value={forgotIdentifier} onChange={e => setForgotIdentifier(e.target.value)} placeholder="kullanıcı adı / e-posta" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.8px solid #d6cdf6', background: '#ffffffcc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {forgotError && <div style={{ background: '#fff0f0', color: '#d54545', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12, border: '1px solid #ffd6d6' }}>{forgotError}</div>}
            {forgotMessage && <div style={{ background: '#f0fff4', color: '#1a7f37', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12, border: '1px solid #ccead5' }}>{forgotMessage}</div>}
            <button onClick={handlePasswordResetRequest} disabled={forgotLoading} style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#8C479C,#4F66D6,#60CDCB)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 800, cursor: forgotLoading ? 'not-allowed' : 'pointer', boxShadow: '0 14px 30px rgba(76,83,187,0.35)', opacity: forgotLoading ? 0.75 : 1 }}>
              {forgotLoading ? 'Gönderiliyor...' : 'Sıfırlama Maili Gönder'}
            </button>
            <button style={{ marginTop: 10, width: '100%', padding: '12px', borderRadius: 12, background: '#ece8ff', color: '#4b3fb8', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }} onClick={() => setMode('login')}>Girişe Dön</button>
          </>
        )}

        {mode === 'reset' && (
          <>
            <div style={{ marginBottom: 14, fontSize: 12, color: '#6D6790' }}>
              Kullanıcı: <strong>@{resetUser}</strong>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4E4A67', display: 'block', marginBottom: 6, letterSpacing: '0.4px' }}>YENİ ŞİFRE</label>
              <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.8px solid #d6cdf6', background: '#ffffffcc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4E4A67', display: 'block', marginBottom: 6, letterSpacing: '0.4px' }}>YENİ ŞİFRE (TEKRAR)</label>
              <input type="password" value={resetPasswordAgain} onChange={e => setResetPasswordAgain(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.8px solid #d6cdf6', background: '#ffffffcc', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {resetError && <div style={{ background: '#fff0f0', color: '#d54545', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12, border: '1px solid #ffd6d6' }}>{resetError}</div>}
            <button onClick={handlePasswordResetConfirm} disabled={resetLoading} style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#8C479C,#4F66D6,#60CDCB)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 800, cursor: resetLoading ? 'not-allowed' : 'pointer', boxShadow: '0 14px 30px rgba(76,83,187,0.35)', opacity: resetLoading ? 0.75 : 1 }}>
              {resetLoading ? 'Kaydediliyor...' : 'Yeni Şifreyi Kaydet'}
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  )
}