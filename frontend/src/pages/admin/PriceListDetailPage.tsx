import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { articlesApi } from '../../lib/api/articles'
import { pricelistsApi } from '../../lib/api/pricelists'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import type { PriceListDetailResponse, PriceListPreviewItem } from '../../lib/api/pricelists'

interface EditablePriceItem {
  key: string
  label: string
  price: string
  coffinArticleId?: string | null
  accessoryArticleId?: string | null
  marmistaArticleId?: string | null
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
  const [priceList, setPriceList] = useState<PriceListDetailResponse | null>(null)
  const [tab, setTab] = useState<Tab>('prices')
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isSavingItems, setIsSavingItems] = useState(false)
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null)
  const [isDeletingRule, setIsDeletingRule] = useState(false)
  const [isAddingRule, setIsAddingRule] = useState(false)
  const [isSubmittingRule, setIsSubmittingRule] = useState(false)
  const [previewItems, setPreviewItems] = useState<PriceListPreviewItem[]>([])
  const [editableItems, setEditableItems] = useState<EditablePriceItem[]>([])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RuleFormData>({
    defaultValues: { filterType: '', filterValue: '', discountType: 'percentage', discountValue: '' },
  })

  const load = useCallback(async () => {
    if (!id) return
    const data = await pricelistsApi.get(id)
    setPriceList(data)
    setPreviewItems([])
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!priceList || priceList.parentId) return
    const currentPriceList = priceList

    let cancelled = false

    async function loadCatalogItems() {
      if (currentPriceList.articleType === 'funeral') {
        const [coffins, accessories] = await Promise.all([
          articlesApi.coffins.list({ page: 1, pageSize: 500 }),
          articlesApi.accessories.list({ page: 1, pageSize: 500 }),
        ])

        if (cancelled) return

        const priceMap = new Map<string, number>()
        for (const item of currentPriceList.items) {
          if (item.coffinArticle) priceMap.set(`coffin:${item.coffinArticle.code}`, item.price)
          if (item.accessoryArticle) priceMap.set(`accessory:${item.accessoryArticle.code}`, item.price)
        }

        setEditableItems([
          ...coffins.data.map((item) => ({
            key: `coffin:${item.code}`,
            label: `[${item.code}] ${item.description}`,
            price: priceMap.get(`coffin:${item.code}`)?.toString() ?? '',
            coffinArticleId: item.id,
            accessoryArticleId: null,
            marmistaArticleId: null,
          })),
          ...accessories.data.map((item) => ({
            key: `accessory:${item.code}`,
            label: `[${item.code}] ${item.description}`,
            price: priceMap.get(`accessory:${item.code}`)?.toString() ?? '',
            coffinArticleId: null,
            accessoryArticleId: item.id,
            marmistaArticleId: null,
          })),
        ])
      } else {
        const marmista = await articlesApi.marmista.list({ page: 1, pageSize: 500 })
        if (cancelled) return

        const priceMap = new Map<string, number>()
        for (const item of currentPriceList.items) {
          if (item.marmistaArticle) priceMap.set(`marmista:${item.marmistaArticle.code}`, item.price)
        }

        setEditableItems(
          marmista.data.map((item) => ({
            key: `marmista:${item.code}`,
            label: `[${item.code}] ${item.description}`,
            price: priceMap.get(`marmista:${item.code}`)?.toString() ?? '',
            coffinArticleId: null,
            accessoryArticleId: null,
            marmistaArticleId: item.id,
          }))
        )
      }
    }

    loadCatalogItems()
    return () => { cancelled = true }
  }, [priceList])

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

  const handlePreview = async () => {
    if (!id) return
    setIsPreviewLoading(true)
    try {
      const result = await pricelistsApi.preview(id)
      setPreviewItems(result.previews)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleSaveItems = async () => {
    if (!id || !priceList || priceList.parentId) return
    setIsSavingItems(true)
    try {
      const items = editableItems
        .filter((item) => item.price.trim() !== '')
        .map((item) => ({
          coffinArticleId: item.coffinArticleId ?? null,
          accessoryArticleId: item.accessoryArticleId ?? null,
          marmistaArticleId: item.marmistaArticleId ?? null,
          price: parseFloat(item.price),
        }))
        .filter((item) => !Number.isNaN(item.price))

      await pricelistsApi.setItems(id, items)
      await load()
    } finally {
      setIsSavingItems(false)
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

  const articleName = (item: PriceListDetailResponse['items'][0] | PriceListPreviewItem) => {
    const art = item.coffinArticle ?? item.accessoryArticle ?? item.marmistaArticle
    return art ? `[${art.code}] ${art.description}` : '—'
  }

  const priceRowKey = (item: PriceListDetailResponse['items'][0] | PriceListPreviewItem) =>
    'itemId' in item ? item.itemId : item.id

  const priceRowValue = (item: PriceListDetailResponse['items'][0] | PriceListPreviewItem) =>
    'computedPrice' in item ? item.computedPrice : item.price

  const priceRows = previewItems.length > 0 ? previewItems : priceList.items

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/pricelists')}
            className="mb-4 inline-flex min-h-10 items-center justify-center border border-[#E5E0D8] px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
          >
            ← Listini
          </button>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">Dettaglio listino</p>
          <h1 className="text-3xl text-[#031634] md:text-4xl" style={{ fontFamily: 'Playfair Display, serif' }}>
            {priceList.name}
          </h1>
        </div>

        <span className="inline-flex min-h-10 items-center border border-[#E5E0D8] bg-white px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[#6B7280] shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
          {priceList.type === 'purchase' ? 'Acquisto' : 'Vendita'} · {priceList.articleType === 'funeral' ? 'Funebre' : 'Marmista'}
        </span>
      </div>

      <div className="mb-6 flex gap-2 border-b border-[#E5E0D8] pb-2">
        {(['prices', 'rules'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={[
              'min-h-10 border px-4 py-2 text-sm font-medium uppercase tracking-[0.14em] transition-colors',
              tab === t
                ? 'border-[#C9A96E] bg-white text-[#031634] shadow-[0_2px_8px_rgba(26,43,74,0.08)]'
                : 'border-transparent text-[#6B7280] hover:border-[#E5E0D8] hover:bg-white hover:text-[#031634]'
            ].join(' ')}>
            {t === 'prices' ? 'Prezzi' : 'Regole'}
          </button>
        ))}
      </div>

      {/* Tab Prezzi */}
      {tab === 'prices' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-3">
            {priceList.parentId && (
              <button
                onClick={handlePreview}
                disabled={isPreviewLoading}
                className="admin-button-secondary disabled:opacity-50"
              >
                {isPreviewLoading ? 'Calcolo…' : 'Anteprima Prezzi'}
              </button>

            )}

            {!priceList.autoUpdate && (
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="inline-flex min-h-11 items-center justify-center border border-[#C9A96E] px-4 py-2 text-sm font-medium uppercase tracking-[0.14em] text-[#C9A96E] transition-colors hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
              >
                {isRecalculating ? 'Ricalcolo…' : 'Ricalcola Snapshot'}
              </button>
            )}

            {!priceList.parentId && (
              <button
                onClick={handleSaveItems}
                disabled={isSavingItems}
                className="admin-button-primary disabled:opacity-50"
              >
                {isSavingItems ? 'Salvataggio…' : 'Salva Prezzi'}
              </button>
            )}
          </div>

          {!priceList.parentId ? (
            editableItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6B7280]">Nessun articolo disponibile per questo dominio.</p>
            ) : (
              <div className="overflow-hidden border border-[#E5E0D8] bg-white shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E0D8] bg-[#F8F7F4]">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6B7280]">Articolo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#6B7280]">Prezzo Base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableItems.map((item) => (
                      <tr key={item.key} className="border-b border-[#E5E0D8] last:border-0">
                        <td className="px-4 py-3 text-[#1A1A1A]">{item.label}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(event) => setEditableItems((current) => current.map((entry) => (
                                entry.key === item.key
                                  ? { ...entry, price: event.target.value }
                                  : entry
                              )))}
                              className="admin-input max-w-[10rem] text-right"
                              placeholder="0.00"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : priceRows.length === 0 ? (
            <p className="text-[#6B7280] text-sm py-8 text-center">Nessun articolo in questo listino.</p>
          ) : (
            <>
              {previewItems.length > 0 && (
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[#C9A96E]">
                  Anteprima non salvata
                </p>
              )}

              <div className="overflow-hidden border border-[#E5E0D8] bg-white shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E0D8] bg-[#F8F7F4]">
                      <th className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Articolo</th>
                      <th className="text-right px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Prezzo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceRows.map(item => (
                      <tr key={priceRowKey(item)} className="border-b border-[#E5E0D8] last:border-0">
                        <td className="px-4 py-3 text-[#1A1A1A]">{articleName(item)}</td>
                        <td className="px-4 py-3 text-right font-mono text-[#1A2B4A]">€ {priceRowValue(item).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Regole */}
      {tab === 'rules' && (
        <div>
          <div className="mb-4">
            <button onClick={() => setIsAddingRule(true)} className="inline-flex min-h-11 items-center justify-center bg-[#031634] px-4 py-2 text-sm font-medium uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1A2B4A]">
              + Aggiungi Regola
            </button>
          </div>

          {priceList.rules.length === 0 ? (
            <p className="text-[#6B7280] text-sm py-8 text-center">Nessuna regola configurata.</p>
          ) : (
            <div className="overflow-hidden border border-[#E5E0D8] bg-white shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
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
            <div className="mt-4 border border-[#E5E0D8] bg-[#F8F7F4] p-5 shadow-[0_2px_8px_rgba(26,43,74,0.05)]">
              <h3 className="mb-3 text-xl text-[#031634]" style={{ fontFamily: 'Playfair Display, serif' }}>Nuova Regola</h3>
              <form onSubmit={onAddRule} className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">Filtro tipo</label>
                  <select {...register('filterType')} className="w-full border border-[#E5E0D8] bg-white px-3 py-2 text-sm focus:border-[#031634] focus:outline-none">
                    <option value="">Tutti gli articoli</option>
                    <option value="category">Categoria</option>
                    <option value="subcategory">Sottocategoria</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">Valore filtro</label>
                  <input {...register('filterValue')} placeholder="Codice categoria" className="w-full border border-[#E5E0D8] px-3 py-2 text-sm focus:border-[#031634] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">Tipo sconto</label>
                  <select {...register('discountType')} className="w-full border border-[#E5E0D8] bg-white px-3 py-2 text-sm focus:border-[#031634] focus:outline-none">
                    <option value="percentage">Percentuale (%)</option>
                    <option value="absolute">Assoluto (€)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">Valore <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" {...register('discountValue', { required: true })} className="w-full border border-[#E5E0D8] px-3 py-2 text-sm focus:border-[#031634] focus:outline-none" />
                  {errors.discountValue && <p className="text-red-500 text-xs mt-1">Obbligatorio</p>}
                </div>
                <div className="col-span-2 flex justify-end gap-3">
                  <button type="button" onClick={() => { setIsAddingRule(false); reset() }} className="inline-flex min-h-11 items-center justify-center border border-[#E5E0D8] px-4 py-2 text-sm font-medium text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]">Annulla</button>
                  <button type="submit" disabled={isSubmittingRule} className="inline-flex min-h-11 items-center justify-center bg-[#031634] px-4 py-2 text-sm font-medium uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1A2B4A] disabled:opacity-50">
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
