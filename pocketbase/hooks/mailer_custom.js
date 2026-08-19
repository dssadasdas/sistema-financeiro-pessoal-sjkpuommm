/// <reference path="../pb_data/types.d.ts" />
// Emails transacionais do Semia em pt-BR:
//  - boas-vindas (após criar conta)
//  - verificação de e-mail (sobrescreve o template padrão)
//  - recuperação de senha (sobrescreve o template padrão)
// Requer configuração SMTP ativa em Dashboard > Settings > Mail settings.

// ---------------------------------------------------------------------------
// 1. E-mail de boas-vindas — disparado após a criação bem-sucedida do usuário.
// ---------------------------------------------------------------------------
onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record
    const email = record.email ? record.email() : ''
    if (!email) return

    const senderAddress = $app.settings().meta.senderAddress || 'noreply@semia.app'
    const senderName = $app.settings().meta.senderName || 'Semia'
    const name = record.getString('name') || email.split('@')[0]

    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
      '<div style="background:linear-gradient(135deg,#059669,#14b8a6);padding:24px;border-radius:16px 16px 0 0;text-align:center">' +
      '<h1 style="color:#fff;margin:0;font-size:22px">Bem-vindo ao Semia 👋</h1>' +
      '</div>' +
      '<div style="border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 16px 16px">' +
      '<p style="font-size:15px;line-height:1.6">Olá, <strong>' +
      name +
      '</strong>!</p>' +
      '<p style="font-size:15px;line-height:1.6">Sua conta no Semia foi criada com sucesso. Agora você tem em um só lugar o controle de receitas, despesas, cartões de crédito, contas a pagar, metas, orçamentos e investimentos — com a ajuda da nossa IA financeira.</p>' +
      '<p style="font-size:15px;line-height:1.6">Para garantir a segurança da sua conta, confirme seu endereço de e-mail no painel de Configurações.</p>' +
      '<div style="text-align:center;margin:28px 0">' +
      '<a href="' +
      ($os.getenv('SITE_URL') || '') +
      '/inicio" style="display:inline-block;background:#059669;color:#fff;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px">Acessar meu painel</a>' +
      '</div>' +
      '<p style="font-size:13px;color:#64748b;margin-top:24px">Se você não criou essa conta, pode ignorar este e-mail com segurança.</p>' +
      '</div></div>'

    const message = new MailerMessage({
      from: { address: senderAddress, name: senderName },
      to: [{ address: email }],
      subject: 'Bem-vindo ao Semia!',
      html: html,
    })

    $app.newMailClient().send(message)
  } catch (err) {
    console.log('Erro ao enviar e-mail de boas-vindas:', err)
  }
}, 'users')

// ---------------------------------------------------------------------------
// 2. Verificação de e-mail — sobrescreve o template padrão em pt-BR.
// ---------------------------------------------------------------------------
onMailerRecordVerificationSend((e) => {
  const name = e.record.getString('name') || e.record.email()
  e.message.subject = 'Confirme seu e-mail no Semia'
  e.message.html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
    '<div style="background:linear-gradient(135deg,#059669,#14b8a6);padding:24px;border-radius:16px 16px 0 0;text-align:center">' +
    '<h1 style="color:#fff;margin:0;font-size:22px">Confirme seu e-mail</h1>' +
    '</div>' +
    '<div style="border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 16px 16px">' +
    '<p style="font-size:15px;line-height:1.6">Olá, <strong>' +
    name +
    '</strong>!</p>' +
    '<p style="font-size:15px;line-height:1.6">Confirme seu endereço de e-mail para garantir a segurança da sua conta no Semia.</p>' +
    '<div style="text-align:center;margin:28px 0">' +
    '<a href="' +
    e.message.actionUrl +
    '" style="display:inline-block;background:#059669;color:#fff;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px">Confirmar e-mail</a>' +
    '</div>' +
    '<p style="font-size:13px;color:#64748b">Se você não solicitou isso, pode ignorar este e-mail.</p>' +
    '<p style="font-size:12px;color:#94a3b8;word-break:break-all">Ou copie o link: ' +
    e.message.actionUrl +
    '</p>' +
    '</div></div>'
  e.next()
})

// ---------------------------------------------------------------------------
// 3. Recuperação de senha — sobrescreve o template padrão em pt-BR.
// ---------------------------------------------------------------------------
onMailerRecordPasswordResetSend((e) => {
  const name = e.record.getString('name') || e.record.email()
  e.message.subject = 'Redefina sua senha no Semia'
  e.message.html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
    '<div style="background:linear-gradient(135deg,#059669,#14b8a6);padding:24px;border-radius:16px 16px 0 0;text-align:center">' +
    '<h1 style="color:#fff;margin:0;font-size:22px">Redefinição de senha</h1>' +
    '</div>' +
    '<div style="border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 16px 16px">' +
    '<p style="font-size:15px;line-height:1.6">Olá, <strong>' +
    name +
    '</strong>!</p>' +
    '<p style="font-size:15px;line-height:1.6">Recebemos uma solicitação para redefinir a senha da sua conta no Semia. Clique no botão abaixo para criar uma nova senha:</p>' +
    '<div style="text-align:center;margin:28px 0">' +
    '<a href="' +
    e.message.actionUrl +
    '" style="display:inline-block;background:#059669;color:#fff;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px">Redefinir senha</a>' +
    '</div>' +
    '<p style="font-size:13px;color:#64748b">Se você não solicitou essa redefinição, ignore este e-mail — sua senha permanece a mesma.</p>' +
    '<p style="font-size:12px;color:#94a3b8;word-break:break-all">Ou copie o link: ' +
    e.message.actionUrl +
    '</p>' +
    '</div></div>'
  e.next()
})
