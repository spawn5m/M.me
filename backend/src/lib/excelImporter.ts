import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import type { ImportResult } from '../types/shared'

export function parseExcelFile(filePath: string): Record<string, string>[] {
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, string>[]
}

export function splitCodes(value: string): string[] {
  return value.split(';').map(s => s.trim()).filter(Boolean)
}

export function validateImagePath(imageField: string, uploadsRoot: string): string | null {
  if (!imageField) return null
  const fullPath = path.join(uploadsRoot, imageField)
  return fs.existsSync(fullPath) ? imageField : null
}

export type { ImportResult }
