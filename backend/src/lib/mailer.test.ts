import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendContactEmail, setTransporter } from './mailer'
import type { Transporter } from 'nodemailer'

describe('sendContactEmail', () => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })

  beforeEach(() => {
    vi.clearAllMocks()
    setTransporter({ sendMail: mockSendMail } as unknown as Transporter)
  })

  it('chiama sendMail con i dati corretti', async () => {
    await sendContactEmail({
      name: 'Mario Rossi',
      email: 'mario@test.com',
      message: 'Ciao, ho una domanda.',
    })
    expect(mockSendMail).toHaveBeenCalledOnce()
    const call = mockSendMail.mock.calls[0][0]
    expect(call.to).toBe(process.env.CONTACT_EMAIL_TO ?? 'info@mirigliani.me')
    expect(call.from).toContain('mario@test.com')
    expect(call.text).toContain('Mario Rossi')
    expect(call.text).toContain('Ciao, ho una domanda.')
  })

  it('propaga errori se sendMail fallisce', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP error'))
    await expect(
      sendContactEmail({
        name: 'Test',
        email: 'test@test.com',
        message: 'Test messaggio lungo abbastanza.',
      })
    ).rejects.toThrow('SMTP error')
  })
})
