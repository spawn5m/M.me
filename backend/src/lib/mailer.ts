import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

export interface ContactEmailData {
  name: string
  email: string
  message: string
}

let transporter: Transporter | null = null

export function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS ?? '',
          }
        : undefined,
    })
  }
  return transporter
}

// Esposto per il testing — permette di iniettare un transporter mock
export function setTransporter(t: Transporter): void {
  transporter = t
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function sendContactEmail(data: ContactEmailData): Promise<void> {
  const to = process.env.CONTACT_EMAIL_TO ?? 'info@mirigliani.me'
  await getTransporter().sendMail({
    from: `"${data.name}" <${data.email}>`,
    to,
    subject: `Contatto dal sito — ${data.name}`,
    text: `Nome: ${data.name}\nEmail: ${data.email}\n\nMessaggio:\n${data.message}`,
    html: `<p><strong>Nome:</strong> ${escapeHtml(data.name)}</p><p><strong>Email:</strong> ${data.email}</p><hr><p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>`,
  })
}
