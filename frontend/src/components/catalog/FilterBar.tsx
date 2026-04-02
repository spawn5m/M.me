import { useState } from 'react'

interface FilterBarProps {
  categories: string[]
  subcategories?: string[]
  onFilter: (filters: { category: string; subcategory: string; search: string }) => void
  totalCount?: number
}

export default function FilterBar({
  categories,
  subcategories,
  onFilter,
  totalCount,
}: FilterBarProps) {
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [search, setSearch] = useState('')

  function handleCategoryChange(value: string) {
    setCategory(value)
    setSubcategory('')
    onFilter({ category: value, subcategory: '', search })
  }

  function handleSubcategoryChange(value: string) {
    setSubcategory(value)
    onFilter({ category, subcategory: value, search })
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    onFilter({ category, subcategory, search: value })
  }

  function handleReset() {
    setCategory('')
    setSubcategory('')
    setSearch('')
    onFilter({ category: '', subcategory: '', search: '' })
  }

  const hasActiveFilters = category !== '' || subcategory !== '' || search !== ''

  return (
    <div className="sticky top-[88px] z-40 bg-[#FAF9F6]/95 backdrop-blur-sm py-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Dropdown categoria */}
        <div className="relative">
          <label htmlFor="filter-category" className="sr-only">
            Categoria
          </label>
          <select
            id="filter-category"
            aria-label="Categoria"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="bg-white border-0 focus:ring-2 focus:ring-[#C9A96E] rounded px-3 py-2 text-sm text-[#031634] min-w-[160px] cursor-pointer outline-none"
          >
            <option value="">Tutte le categorie</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown sottocategoria */}
        {subcategories && subcategories.length > 0 && (
          <div className="relative">
            <label htmlFor="filter-subcategory" className="sr-only">
              Sottocategoria
            </label>
            <select
              id="filter-subcategory"
              aria-label="Sottocategoria"
              value={subcategory}
              onChange={(e) => handleSubcategoryChange(e.target.value)}
              className="bg-white border-0 focus:ring-2 focus:ring-[#C9A96E] rounded px-3 py-2 text-sm text-[#031634] min-w-[160px] cursor-pointer outline-none"
            >
              <option value="">Tutte le sottocategorie</option>
              {subcategories.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Input ricerca */}
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#44474e]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cerca prodotto..."
            className="w-full bg-white border-0 focus:ring-2 focus:ring-[#C9A96E] rounded pl-10 pr-4 py-2 text-sm text-[#031634] outline-none"
          />
        </div>

        {/* Chip filtri attivi / Pulisci */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-sm font-medium text-[#C9A96E] border border-[#C9A96E] px-3 py-2 hover:bg-[#C9A96E] hover:text-white transition-colors duration-150 rounded"
          >
            Pulisci filtri
          </button>
        )}

        {/* Contatore */}
        {totalCount !== undefined && (
          <span className="font-mono text-xs text-[#44474e] ml-auto">
            {totalCount} Articoli trovati
          </span>
        )}
      </div>

      {/* Chip categoria attiva */}
      {category && (
        <div className="flex gap-2 mt-3">
          <span className="inline-flex items-center gap-1 bg-[#031634] text-white text-xs px-3 py-1 rounded-full font-medium">
            {category}
            <button
              onClick={() => handleCategoryChange('')}
              className="ml-1 hover:text-[#C9A96E] transition-colors"
              aria-label={`Rimuovi filtro ${category}`}
            >
              ×
            </button>
          </span>
          {subcategory && (
            <span className="inline-flex items-center gap-1 bg-[#031634] text-white text-xs px-3 py-1 rounded-full font-medium">
              {subcategory}
              <button
                onClick={() => handleSubcategoryChange('')}
                className="ml-1 hover:text-[#C9A96E] transition-colors"
                aria-label={`Rimuovi filtro ${subcategory}`}
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
