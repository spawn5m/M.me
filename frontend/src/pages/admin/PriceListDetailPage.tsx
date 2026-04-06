import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { pricelistsApi } from '../../lib/api/pricelists'
import ConfirmDialog from '../../components/admin/ConfirmDialog'

interface PriceListFull {
  id: string
  name: string
  type: string
  articleType: string
  autoUpdate: boolean
  parentId: string | null
  rules: Array<{ id: string; filterType: string | null; filterValue: string | null; discountType: string; discountValue: number }>
  items: Array<{ id: string; price: number; coffinArticle?: { code: string; description: string } | null; accessoryArticle?: { code: string; description: string } | null; marmistaArticle?: { code: string; description: string } | null }>
  _count: { items: number }
}

interface RuleFormData {
  filterType: '' | 'category' | 'subcategory'
  filterValue: string
  discountType: 'percentage' | 'absolute'
  discountValue: string
}

type Tab = 'prices' | 'rules'

export default function PriceListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [priceList, setPriceList] = useState<PriceListFull | null>(null)
  const [tab, setTab] = useState<Tab>('prices')
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null)
  const [isDeletingRule, setIsDeletingRule] = useState(false)
  const [isAddingRule, setIsAddingRule] = useState(false)
  const [isSubmittingRule, setIsSubmittingRule] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RuleFormData>({
    defaultValues: { filterType: '', filterValue: '', discountType: 'percentage', discountValue: '' },
  })

  const load = useCallback(async () => {
    if (!id) return
    const data = await pricelistsApi.get(id) as unknown as PriceListFull
    setPriceList(data)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRecalculate = async () => {
    if (!id) return
    setIsRecalculating(true)
    try {
      await pricelistsApi.recalculate(id)
      load()
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleDeleteRule = async () => {
    if (!id || !deletingRuleId) return
    setIsDeletingRule(true)
    try {
      await pricelistsApi.removeRule(id, deletingRuleId)
      setDeletingRuleId(null)
      load()
    } finally {
      setIsDeletingRule(false)
    }
  }

  const onAddRule = handleSubmit(async (data) => {
    if (!id) return
    setIsSubmittingRule(true)
    try {
      await pricelistsApi.addRule(id, {
        filterType: data.filterType || null,
        filterValue: data.filterValue || null,
        discountType: data.discountType,
        discountValue: parseFloat(data.discountValue),
      })
      setIsAddingRule(false)
      reset()
      load()
    } finally {
      setIsSubmittingRule(false)
    }
  })

  if (!priceList) {
    return <div className="p-6 text-[#6B7280] text-sm">Caricamento…</div>
  }

  const articleName = (item: PriceListFull['items'][0]) => {
    const art = item.coffinArticle ?? item.accessoryArticle ?? item.marmistaArticle
    return art ? `[${art.code}] ${art.description}` : '—'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/pricelists')} className="text-[#6B7280] hover:text-[#1A2B4A] text-sm transition-colors">
          ← Listini
        </button>
        <h1 className="text-2xl text-[#1A2B4A]" style={{ fontFamily: 'Playfair Display, serif' }}>
          {priceList.name}
        </h1>
        <span className="text-xs px-2 py-1 bg-[#F8F7F4] text-[#6B7280] rounded border border-[#E5E0D8]">
          {priceList.type === 'purchase' ? 'Acquisto' : 'Vendita'} · {priceList.articleType === 'funeral' ? 'Funebre' : 'Marmista'}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#E5E0D8] mb-6">
        {(['prices', 'rules'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={['px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', tab === t ? 'border-[#1A2B4A] text-[#1A2B4A]' : 'border-transparent text-[#6B7280] hover:text-[#1A2B4A]'].join(' ')}>
            {t === 'prices' ? 'Prezzi' : 'Regole'}
          </button>
        ))}
      </div>

      {/* Tab Prezzi */}
      {tab === 'prices' && (
        <div>
          {!priceList.autoUpdate && (
            <div className="mb-4">
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="border border-[#C9A96E] text-[#C9A96E] px-4 py-2 text-sm font-medium rounded hover:bg-[#C9A96E] hover:text-white transition-colors disabled:opacity-50"
              >
                {isRecalculating ? 'Ricalcolo…' : 'Ricalcola Snapshot'}
              </button>
            </div>
          )}

          {priceList.items.length === 0 ? (
            <p className="text-[#6B7280] text-sm py-8 text-center">Nessun articolo in questo listino.</p>
          ) : (
            <div className="bg-white rounded-lg border border-[#E5E0D8] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E0D8] bg-[#F8F7F4]">
                    <th className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Articolo</th>
                    <th className="text-right px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Prezzo</th>
                  </tr>
                </thead>
                <tbody>
                  {priceList.items.map(item => (
                    <tr key={item.id} className="border-b border-[#E5E0D8] last:border-0">
                      <td className="px-4 py-3 text-[#1A1A1A]">{articleName(item)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#1A2B4A]">€ {item.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Regole */}
      {tab === 'rules' && (
        <div>
          <div className="mb-4">
            <button onClick={() => setIsAddingRule(true)} className="bg-[#1A2B4A] text-white px-4 py-2 text-sm font-medium rounded hover:bg-[#2C4A7C] transition-colors">
              + Aggiungi Regola
            </button>
          </div>

          {priceList.rules.length === 0 ? (
            <p className="text-[#6B7280] text-sm py-8 text-center">Nessuna regola configurata.</p>
          ) : (
            <div className="bg-white rounded-lg border border-[#E5E0D8] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E0D8] bg-[#F8F7F4]">
                    <th className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Filtro</th>
                    <th className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Sconto</th>
                    <th className="text-right px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {priceList.rules.map(rule => (
                    <tr key={rule.id} className="border-b border-[#E5E0D8] last:border-0">
                      <td className="px-4 py-3 text-[#1A1A1A]">
                        {rule.filterType ? `${rule.filterType}: ${rule.filterValue}` : 'Tutti gli articoli'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#1A2B4A]">
                        {rule.discountType === 'percentage' ? `${rule.discountValue}%` : `- € ${rule.discountValue}`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setDeletingRuleId(rule.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors">Elimina</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Form aggiunta regola inline */}
          {isAddingRule && (
            <div className="mt-4 p-4 border border-[#E5E0D8] rounded-lg bg-[#F8F7F4]">
              <h3 className="text-sm font-medium text-[#1A2B4A] mb-3">Nuova Regola</h3>
              <form onSubmit={onAddRule} className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Filtro tipo</label>
                  <select {...register('filterType')} className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#1A2B4A]">
                    <option value="">Tutti gli articoli</option>
                    <option value="category">Categoria</option>
                    <option value="subcategory">Sottocategoria</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Valore filtro</label>
                  <input {...register('filterValue')} placeholder="Codice categoria" className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1A2B4A]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Tipo sconto</label>
                  <select {...register('discountType')} className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#1A2B4A]">
                    <option value="percentage">Percentuale (%)</option>
                    <option value="absolute">Assoluto (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Valore <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" {...register('discountValue', { required: true })} className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1A2B4A]" />
                  {errors.discountValue && <p className="text-red-500 text-xs mt-1">Obbligatorio</p>}
                </div>
                <div className="col-span-2 flex justify-end gap-3">
                  <button type="button" onClick={() => { setIsAddingRule(false); reset() }} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#1A2B4A] transition-colors">Annulla</button>
                  <button type="submit" disabled={isSubmittingRule} className="px-4 py-2 text-sm bg-[#1A2B4A] text-white rounded hover:bg-[#2C4A7C] disabled:opacity-50 transition-colors">
                    {isSubmittingRule ? 'Salvataggio…' : 'Aggiungi'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog isOpen={!!deletingRuleId} title="Elimina Regola" message="Eliminare questa regola di sconto?" onConfirm={handleDeleteRule} onCancel={() => setDeletingRuleId(null)} isConfirming={isDeletingRule} confirmLabel="Elimina" />
    </div>
  )
}
