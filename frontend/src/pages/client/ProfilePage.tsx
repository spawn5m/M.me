import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

// ─── Schemi ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(1, 'Obbligatorio'),
  lastName: z.string().min(1, 'Obbligatorio'),
  email: z.string().email('Email non valida'),
  intestazione: z.string().optional(),
  indirizzo: z.string().optional(),
  numeroCivico: z.string().optional(),
  cap: z.string().optional(),
  comune: z.string().optional(),
  provincia: z.string().max(2, 'Max 2 caratteri').optional(),
})

const passwordSchema = z.object({
  oldPassword: z.string().min(1, 'Obbligatorio'),
  newPassword: z.string().min(8, 'Minimo 8 caratteri'),
  confirmPassword: z.string().min(1, 'Obbligatorio'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Le password non coincidono',
  path: ['confirmPassword'],
})

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

interface ProfileData {
  id: string
  email: string
  firstName: string
  lastName: string
  intestazione: string | null
  indirizzo: string | null
  numeroCivico: string | null
  cap: string | null
  comune: string | null
  provincia: string | null
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ClientProfilePage() {
  const { refresh } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  const firstNameId = useId()
  const lastNameId = useId()
  const emailId = useId()
  const intestazioneId = useId()
  const indirizzoId = useId()
  const numeroCivicoId = useId()
  const capId = useId()
  const comuneId = useId()
  const provinciaId = useId()
  const oldPasswordId = useId()
  const newPasswordId = useId()
  const confirmPasswordId = useId()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>()

  const {
    register: registerPw,
    handleSubmit: handleSubmitPw,
    reset: resetPw,
    formState: { errors: errorsPw, isSubmitting: isSubmittingPw },
  } = useForm<PasswordFormValues>()

  useEffect(() => {
    api.get<ProfileData>('/auth/profile').then((res) => {
      setProfileData(res.data)
      reset({
        firstName: res.data.firstName,
        lastName: res.data.lastName,
        email: res.data.email,
        intestazione: res.data.intestazione ?? '',
        indirizzo: res.data.indirizzo ?? '',
        numeroCivico: res.data.numeroCivico ?? '',
        cap: res.data.cap ?? '',
        comune: res.data.comune ?? '',
        provincia: res.data.provincia ?? '',
      })
    })
  }, [reset])

  const onProfileSubmit = async (values: ProfileFormValues) => {
    setProfileError(null)
    setProfileSuccess(false)
    const result = profileSchema.safeParse(values)
    if (!result.success) return
    try {
      await api.put('/auth/profile', result.data)
      setProfileSuccess(true)
      await refresh()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setProfileError(msg ?? 'Errore durante il salvataggio')
    }
  }

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setPwError(null)
    setPwSuccess(false)
    const result = passwordSchema.safeParse(values)
    if (!result.success) return
    try {
      await api.put('/auth/password', {
        oldPassword: result.data.oldPassword,
        newPassword: result.data.newPassword,
      })
      setPwSuccess(true)
      resetPw()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setPwError(msg ?? 'Errore durante il cambio password')
    }
  }

  if (!profileData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#031634] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="admin-page-intro">
        <div>
          <p className="admin-page-kicker">Area riservata</p>
          <h2 className="admin-page-title">Il mio profilo</h2>
          <p className="admin-page-description">
            Modifica i tuoi dati personali e la password di accesso.
          </p>
        </div>
      </div>

      {/* Sezione dati profilo */}
      <section className="border border-[#E5E0D8] bg-white p-6">
        <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-[#1A2B4A]">Dati personali</p>

        <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label" htmlFor={firstNameId}>Nome</label>
              <input id={firstNameId} {...register('firstName')} className="admin-input" />
              {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="admin-label" htmlFor={lastNameId}>Cognome</label>
              <input id={lastNameId} {...register('lastName')} className="admin-input" />
              {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="admin-label" htmlFor={emailId}>Email</label>
            <input id={emailId} {...register('email')} type="email" className="admin-input" />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-3 border-t border-[#E5E0D8] pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#1A2B4A]">Anagrafica</p>
            <div>
              <label className="admin-label" htmlFor={intestazioneId}>Intestazione</label>
              <input id={intestazioneId} {...register('intestazione')} className="admin-input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="admin-label" htmlFor={indirizzoId}>Indirizzo</label>
                <input id={indirizzoId} {...register('indirizzo')} className="admin-input" />
              </div>
              <div>
                <label className="admin-label" htmlFor={numeroCivicoId}>N. civico</label>
                <input id={numeroCivicoId} {...register('numeroCivico')} className="admin-input" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="admin-label" htmlFor={capId}>CAP</label>
                <input id={capId} {...register('cap')} className="admin-input" />
              </div>
              <div>
                <label className="admin-label" htmlFor={comuneId}>Comune</label>
                <input id={comuneId} {...register('comune')} className="admin-input" />
              </div>
              <div>
                <label className="admin-label" htmlFor={provinciaId}>Prov.</label>
                <input id={provinciaId} {...register('provincia')} maxLength={2} className="admin-input uppercase" />
                {errors.provincia && <p className="mt-1 text-xs text-red-500">{errors.provincia.message}</p>}
              </div>
            </div>
          </div>

          {profileError && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{profileError}</p>
          )}
          {profileSuccess && (
            <p className="border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Profilo aggiornato.</p>
          )}

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={isSubmitting} className="admin-button-primary disabled:opacity-50">
              {isSubmitting ? 'Salvataggio…' : 'Salva profilo'}
            </button>
          </div>
        </form>
      </section>

      {/* Sezione password */}
      <section className="border border-[#E5E0D8] bg-white p-6">
        <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-[#1A2B4A]">Cambia password</p>

        <form onSubmit={handleSubmitPw(onPasswordSubmit)} className="space-y-4">
          <div>
            <label className="admin-label" htmlFor={oldPasswordId}>Password attuale</label>
            <input id={oldPasswordId} {...registerPw('oldPassword')} type="password" className="admin-input" />
            {errorsPw.oldPassword && <p className="mt-1 text-xs text-red-500">{errorsPw.oldPassword.message}</p>}
          </div>
          <div>
            <label className="admin-label" htmlFor={newPasswordId}>Nuova password</label>
            <input id={newPasswordId} {...registerPw('newPassword')} type="password" className="admin-input" />
            {errorsPw.newPassword && <p className="mt-1 text-xs text-red-500">{errorsPw.newPassword.message}</p>}
          </div>
          <div>
            <label className="admin-label" htmlFor={confirmPasswordId}>Conferma nuova password</label>
            <input id={confirmPasswordId} {...registerPw('confirmPassword')} type="password" className="admin-input" />
            {errorsPw.confirmPassword && <p className="mt-1 text-xs text-red-500">{errorsPw.confirmPassword.message}</p>}
          </div>

          {pwError && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{pwError}</p>
          )}
          {pwSuccess && (
            <p className="border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Password aggiornata.</p>
          )}

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={isSubmittingPw} className="admin-button-primary disabled:opacity-50">
              {isSubmittingPw ? 'Aggiornamento…' : 'Aggiorna password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
