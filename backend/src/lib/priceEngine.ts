import type { PriceRule, PriceListNode, ArticleContext } from '../types/shared'

/**
 * Applica le regole di sconto a un prezzo base.
 * Le regole senza filtro si applicano a tutti gli articoli.
 * Le regole con filtro si applicano solo agli articoli con il campo corrispondente.
 * Più regole vengono applicate in sequenza.
 */
export function applyRules(
  basePrice: number,
  rules: PriceRule[],
  article: Pick<ArticleContext, 'categoryCode' | 'subcategoryCode'>
): number {
  let price = basePrice

  for (const rule of rules) {
    const matches =
      rule.filterType === null ||
      (rule.filterType === 'category' && article.categoryCode === rule.filterValue) ||
      (rule.filterType === 'subcategory' && article.subcategoryCode === rule.filterValue)

    if (!matches) continue

    if (rule.discountType === 'percentage') {
      price = price * (1 - rule.discountValue / 100)
    } else {
      price = price - rule.discountValue
    }
  }

  return Math.max(0, price)
}

/**
 * Calcola il prezzo effettivo per un articolo dato un nodo del listino.
 *
 * - autoUpdate: false → restituisce staticPrice (snapshot salvato in DB)
 * - autoUpdate: true  → calcola ricorsivamente dal padre applicando le regole
 */
export function computePrice(
  node: PriceListNode,
  article: ArticleContext,
  staticPrice?: number
): number {
  if (!node.autoUpdate) {
    return staticPrice ?? article.basePrice
  }

  const parentPrice = node.parent
    ? computePrice(node.parent, article)
    : article.basePrice

  return applyRules(parentPrice, node.rules, article)
}

/**
 * Verifica se un set di ruoli ha accesso al listino acquisto.
 * Solo manager e super_admin possono vedere i prezzi di acquisto.
 */
export function canSeePurchaseList(roles: string[]): boolean {
  return roles.some((r) => r === 'manager' || r === 'super_admin')
}
