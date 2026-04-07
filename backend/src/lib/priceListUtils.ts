import type { Prisma } from '@prisma/client'
import { applyRules } from './priceEngine'
import type { PriceListNode, ArticleContext } from '../types/shared'

export interface LoadedPriceListTree {
  id: string
  name: string
  type: 'purchase' | 'sale'
  articleType: 'funeral' | 'marmista'
  parentId: string | null
  autoUpdate: boolean
  rules: Array<{
    filterType: string | null
    filterValue: string | null
    discountType: 'percentage' | 'absolute'
    discountValue: number
  }>
  parent?: LoadedPriceListTree
}

export interface ComputedPriceListItem {
  sourceItemId: string
  computedPrice: number
  categoryCode?: string
  subcategoryCode?: string
  coffinArticleId: string | null
  accessoryArticleId: string | null
  marmistaArticleId: string | null
  coffinArticle: { code: string; description: string } | null
  accessoryArticle: { code: string; description: string } | null
  marmistaArticle: { code: string; description: string } | null
}

export interface PrismaClientLike {
  priceList: Prisma.TransactionClient['priceList']
  priceListItem: Prisma.TransactionClient['priceListItem']
}

// Generic article context input — allows getArticleContext to work
// without depending on the specific priceListItemInclude shape.
export interface ArticleContextInput {
  price: number
  coffinArticle: {
    id?: string
    categories: Array<{ code: string }>
    subcategories?: Array<{ code: string }>
  } | null
  accessoryArticle: {
    id?: string
    categories: Array<{ code: string }>
    subcategories?: Array<{ code: string }>
  } | null
  marmistaArticle: {
    id?: string
    categories: Array<{ code: string }>
  } | null
}

const priceListTreeSelect = {
  id: true,
  name: true,
  type: true,
  articleType: true,
  parentId: true,
  autoUpdate: true,
  rules: true,
} as const

export function buildNode(pl: LoadedPriceListTree): PriceListNode {
  return {
    type: pl.type,
    autoUpdate: pl.autoUpdate,
    rules: pl.rules.map((rule) => ({
      filterType: (rule.filterType as 'category' | 'subcategory' | null) ?? null,
      filterValue: rule.filterValue,
      discountType: rule.discountType,
      discountValue: rule.discountValue,
    })),
    parent: pl.parent ? buildNode(pl.parent) : undefined,
  }
}

export async function loadPriceListTree(
  prisma: Prisma.TransactionClient | PrismaClientLike,
  id: string,
): Promise<LoadedPriceListTree | null> {
  const item = await prisma.priceList.findUnique({
    where: { id },
    select: priceListTreeSelect,
  })
  if (!item) return null

  const parent = item.parentId ? await loadPriceListTree(prisma, item.parentId) : undefined
  return {
    ...item,
    type: item.type,
    articleType: item.articleType,
    parentId: item.parentId,
    parent: parent ?? undefined,
  }
}

export function getArticleContext(item: ArticleContextInput): ArticleContext {
  return {
    basePrice: item.price,
    categoryCode: item.coffinArticle?.categories[0]?.code
      ?? item.accessoryArticle?.categories[0]?.code
      ?? item.marmistaArticle?.categories[0]?.code,
    subcategoryCode: item.coffinArticle?.subcategories?.[0]?.code
      ?? item.accessoryArticle?.subcategories?.[0]?.code,
  }
}

export async function buildComputedItems(
  prisma: PrismaClientLike,
  list: LoadedPriceListTree,
): Promise<ComputedPriceListItem[]> {
  if (!list.parent) {
    const storedItems = await prisma.priceListItem.findMany({
      where: { priceListId: list.id },
      include: {
        coffinArticle: {
          select: {
            id: true,
            code: true,
            description: true,
            categories: { select: { code: true } },
            subcategories: { select: { code: true } },
          },
        },
        accessoryArticle: {
          select: {
            id: true,
            code: true,
            description: true,
            categories: { select: { code: true } },
            subcategories: { select: { code: true } },
          },
        },
        marmistaArticle: {
          select: {
            id: true,
            code: true,
            description: true,
            categories: { select: { code: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    })

    return storedItems.map((item) => {
      const context = getArticleContext(item)
      return {
        sourceItemId: item.id,
        computedPrice: item.price,
        categoryCode: context.categoryCode,
        subcategoryCode: context.subcategoryCode,
        coffinArticleId: item.coffinArticle?.id ?? null,
        accessoryArticleId: item.accessoryArticle?.id ?? null,
        marmistaArticleId: item.marmistaArticle?.id ?? null,
        coffinArticle: item.coffinArticle
          ? { code: item.coffinArticle.code, description: item.coffinArticle.description }
          : null,
        accessoryArticle: item.accessoryArticle
          ? { code: item.accessoryArticle.code, description: item.accessoryArticle.description }
          : null,
        marmistaArticle: item.marmistaArticle
          ? { code: item.marmistaArticle.code, description: item.marmistaArticle.description }
          : null,
      }
    })
  }

  const parentItems = await buildComputedItems(prisma, list.parent)
  const rules = buildNode(list).rules

  return parentItems.map((item) => ({
    ...item,
    computedPrice: applyRules(item.computedPrice, rules, {
      categoryCode: item.categoryCode,
      subcategoryCode: item.subcategoryCode,
    }),
  }))
}
