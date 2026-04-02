import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import api from '../lib/api'

const contactSchema = z.object({
  name: z.string().min(2, 'Il nome deve avere almeno 2 caratteri'),
  email: z.string().email('Email non valida'),
  message: z.string().min(10, 'Il messaggio deve avere almeno 10 caratteri'),
})

type FormValues = z.infer<typeof contactSchema>
type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactForm() {
  const { t } = useTranslation()
  const [values, setValues] = useState<FormValues>({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Status>('idle')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = contactSchema.safeParse(values)
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        errs[err.path[0] as string] = err.message
      })
      setErrors(errs)
      return
    }
    setErrors({})
    setStatus('sending')
    try {
      await api.post('/public/contact', values)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-white border border-[#E5E0D8] p-8 text-center">
        <div className="w-px h-10 bg-[#C9A96E] mx-auto mb-4" />
        <p className="text-[#031634] font-medium text-lg">{t('whereWeAre.contactSent')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-white border border-[#E5E0D8] p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Nome */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="contact-name"
            className="text-xs font-medium uppercase tracking-[0.1em] text-[#031634]"
          >
            {t('whereWeAre.contactName')}
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={handleChange}
            className={`border px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#C9A96E] bg-[#FAF9F6] transition-colors ${
              errors.name ? 'border-red-400' : 'border-[#E5E0D8]'
            }`}
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="contact-email"
            className="text-xs font-medium uppercase tracking-[0.1em] text-[#031634]"
          >
            {t('whereWeAre.contactEmail')}
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            className={`border px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#C9A96E] bg-[#FAF9F6] transition-colors ${
              errors.email ? 'border-red-400' : 'border-[#E5E0D8]'
            }`}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
        </div>
      </div>

      {/* Messaggio */}
      <div className="flex flex-col gap-1 mb-6">
        <label
          htmlFor="contact-message"
          className="text-xs font-medium uppercase tracking-[0.1em] text-[#031634]"
        >
          {t('whereWeAre.contactMessage')}
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          value={values.message}
          onChange={handleChange}
          className={`border px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#C9A96E] bg-[#FAF9F6] resize-none transition-colors ${
            errors.message ? 'border-red-400' : 'border-[#E5E0D8]'
          }`}
        />
        {errors.message && (
          <p className="text-xs text-red-500 mt-1">{errors.message}</p>
        )}
      </div>

      {/* Feedback errore invio */}
      {status === 'error' && (
        <p className="text-sm text-red-500 mb-4">{t('whereWeAre.contactError')}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full md:w-auto px-10 py-3 text-sm font-medium uppercase tracking-[0.15em] border border-[#031634] text-[#031634] hover:bg-[#031634] hover:text-white transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? t('whereWeAre.contactSending') : t('whereWeAre.contactSend')}
      </button>
    </form>
  )
}
