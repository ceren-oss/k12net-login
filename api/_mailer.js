const RESEND_API_URL = 'https://api.resend.com/emails'

const getMailerConfig = () => {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim()
  const from = String(process.env.RESET_EMAIL_FROM || process.env.MAIL_FROM || '').trim()
  return { apiKey, from, configured: Boolean(apiKey && from) }
}

const isPasswordResetMailerConfigured = () => getMailerConfig().configured

const sendPasswordResetEmail = async ({ to, resetUrl, expiresMinutes = 30, recipientName = '' }) => {
  const { apiKey, from, configured } = getMailerConfig()
  if (!configured) throw new Error('MAIL_NOT_CONFIGURED')

  const safeTo = String(to || '').trim()
  if (!safeTo) throw new Error('MAIL_RECIPIENT_REQUIRED')

  const greeting = recipientName ? `Merhaba ${recipientName},` : 'Merhaba,'
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#1f2937">
      <h2 style="margin:0 0 12px;color:#7c3aed">Şifre Sıfırlama</h2>
      <p>${greeting}</p>
      <p>Admin hesabınız için şifre sıfırlama talebi alındı. Yeni şifre belirlemek için aşağıdaki bağlantıyı kullanın:</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700">Şifremi Sıfırla</a></p>
      <p>Bu bağlantı ${expiresMinutes} dakika içinde geçersiz olur.</p>
      <p>Bu işlemi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>
    </div>
  `.trim()
  const text = `${greeting}\n\nAdmin hesabınız için şifre sıfırlama talebi alındı.\nYeni şifre belirlemek için bağlantı: ${resetUrl}\n\nBu bağlantı ${expiresMinutes} dakika içinde geçersiz olur.\nBu işlemi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.`

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [safeTo],
      subject: 'Keşif Kutusu - Şifre Sıfırlama',
      html,
      text,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`MAIL_SEND_FAILED:${response.status}:${errorText}`)
  }
}

module.exports = {
  isPasswordResetMailerConfigured,
  sendPasswordResetEmail,
}
