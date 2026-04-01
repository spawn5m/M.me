import { describe, it, expect } from 'vitest'
import { applyRules, computePrice, canSeePurchaseList } from './priceEngine'
import type { PriceRule, PriceListNode, ArticleContext } from '../types/shared'

describe('applyRules', () => {
  it('applica sconto percentuale su tutti gli articoli (nessun filtro)', () => {
    const rules: PriceRule[] = [
      { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }
    ]
    const article: ArticleContext = { basePrice: 100 }
    expect(applyRules(100, rules, article)).toBe(90)
  })

  it('applica sconto assoluto su tutti gli articoli (nessun filtro)', () => {
    const rules: PriceRule[] = [
      { filterType: null, filterValue: null, discountType: 'absolute', discountValue: 15 }
    ]
    const article: ArticleContext = { basePrice: 100 }
    expect(applyRules(100, rules, article)).toBe(85)
  })

  it('applica sconto solo ad articoli della categoria corrispondente', () => {
    const rules: PriceRule[] = [
      { filterType: 'category', filterValue: 'CAT-A', discountType: 'percentage', discountValue: 20 }
    ]
    const inCategory: ArticleContext = { basePrice: 100, categoryCode: 'CAT-A' }
    const outCategory: ArticleContext = { basePrice: 100, categoryCode: 'CAT-B' }
    expect(applyRules(100, rules, inCategory)).toBe(80)
    expect(applyRules(100, rules, outCategory)).toBe(100)
  })

  it('non scende sotto zero con sconto assoluto eccessivo', () => {
    const rules: PriceRule[] = [
      { filterType: null, filterValue: null, discountType: 'absolute', discountValue: 200 }
    ]
    const article: ArticleContext = { basePrice: 100 }
    expect(applyRules(100, rules, article)).toBe(0)
  })
})

describe('computePrice', () => {
  it('autoUpdate false → restituisce il prezzo statico snapshot senza applicare regole', () => {
    const node: PriceListNode = {
      type: 'sale',
      autoUpdate: false,
      rules: [
        { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 50 }
      ]
    }
    const article: ArticleContext = { basePrice: 100 }
    expect(computePrice(node, article, 75)).toBe(75)
  })

  it('autoUpdate true + nessun parent → applica regole al basePrice', () => {
    const node: PriceListNode = {
      type: 'sale',
      autoUpdate: true,
      rules: [
        { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }
      ]
    }
    const article: ArticleContext = { basePrice: 200 }
    expect(computePrice(node, article)).toBe(180)
  })

  it('autoUpdate true + parent → calcolo ricorsivo: applica regole al prezzo del padre', () => {
    const parent: PriceListNode = {
      type: 'sale',
      autoUpdate: true,
      rules: [
        { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }
      ]
    }
    const child: PriceListNode = {
      type: 'sale',
      autoUpdate: true,
      rules: [
        { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 5 }
      ],
      parent
    }
    // 200 → padre -10% = 180 → figlio -5% = 171
    const article: ArticleContext = { basePrice: 200 }
    expect(computePrice(child, article)).toBeCloseTo(171)
  })

  it('calcolo ricorsivo su listino derivato da derivato (3 livelli)', () => {
    const grandparent: PriceListNode = {
      type: 'sale', autoUpdate: true,
      rules: [{ filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }]
    }
    const parent: PriceListNode = {
      type: 'sale', autoUpdate: true,
      rules: [{ filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }],
      parent: grandparent
    }
    const child: PriceListNode = {
      type: 'sale', autoUpdate: true,
      rules: [{ filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }],
      parent
    }
    // 1000 → -10% = 900 → -10% = 810 → -10% = 729
    const article: ArticleContext = { basePrice: 1000 }
    expect(computePrice(child, article)).toBeCloseTo(729)
  })
})

describe('canSeePurchaseList', () => {
  it('super_admin può vedere il listino acquisto', () => {
    expect(canSeePurchaseList(['super_admin'])).toBe(true)
  })

  it('manager può vedere il listino acquisto', () => {
    expect(canSeePurchaseList(['manager'])).toBe(true)
  })

  it('collaboratore NON può vedere il listino acquisto', () => {
    expect(canSeePurchaseList(['collaboratore'])).toBe(false)
  })

  it('impresario_funebre NON può vedere il listino acquisto', () => {
    expect(canSeePurchaseList(['impresario_funebre'])).toBe(false)
  })

  it('marmista NON può vedere il listino acquisto', () => {
    expect(canSeePurchaseList(['marmista'])).toBe(false)
  })
})
