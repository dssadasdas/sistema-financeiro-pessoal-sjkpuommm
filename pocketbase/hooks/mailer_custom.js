/// <reference path="../pb_data/types.d.ts" />
// Emails transacionais do Semeia em pt-BR — templates do Mailer nativo.
//
// O e-mail de boas-vindas foi movido para subscription_emails.js (via SendGrid,
// com fallback para o Mailer nativo). Este arquivo mantém apenas a
// personalização pt-BR dos templates de VERIFICAÇÃO DE E-MAIL e
// RECUPERAÇÃO DE SENHA, que sobrescrevem os padrões do PocketBase.
//
// Requer configuração SMTP ativa em Dashboard > Settings > Mail settings OU
// SendGrid configurado via subscription_emails.js (para boas-vindas).

// ---------------------------------------------------------------------------
// 1. Verificação de e-mail — sobrescreve o template padrão em pt-BR.
// ---------------------------------------------------------------------------
onMailerRecordVerificationSend((e) => {
  const name = e.record.getString('name') || e.record.email()
  e.message.subject = 'Confirme seu e-mail no Semeia'
  e.message.html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
    '<div style="background:linear-gradient(135deg,#059669,#14b8a6);padding:24px;border-radius:16px 16px 0 0;text-align:center">' +
    '<h1 style="color:#fff;margin:0;font-size:22px">Confirme seu e-mail</h1>' +
    '</div>' +
    '<div style="border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 16px 16px">' +
    '<p style="font-size:15px;line-height:1.6">Olá, <strong>' +
    name +
    '</strong>!</p>' +
    '<p style="font-size:15px;line-height:1.6">Confirme seu endereço de e-mail para garantir a segurança da sua conta no Semeia.</p>' +
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
// 2. Recuperação de senha — sobrescreve o template padrão em pt-BR.
// ---------------------------------------------------------------------------
onMailerRecordPasswordResetSend((e) => {
  const name = e.record.getString('name') || e.record.email()
  e.message.subject = 'Redefina sua senha no Semeia'
  e.message.html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
    '<div style="background:linear-gradient(135deg,#059669,#14b8a6);padding:24px;border-radius:16px 16px 0 0;text-align:center">' +
    '<h1 style="color:#fff;margin:0;font-size:22px">Redefinição de senha</h1>' +
    '</div>' +
    '<div style="border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 16px 16px">' +
    '<p style="font-size:15px;line-height:1.6">Olá, <strong>' +
    name +
    '</strong>!</p>' +
    '<p style="font-size:15px;line-height:1.6">Recebemos uma solicitação para redefinir a senha da sua conta no Semeia. Clique no botão abaixo para criar uma nova senha:</p>' +
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
