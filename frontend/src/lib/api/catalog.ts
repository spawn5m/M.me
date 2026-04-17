import api from '../api'
import type { CatalogStatus, CatalogLayoutPublic } from '../../../../backend/src/types/shared'

const base = '/admin/catalog'

export interface CatalogLayoutParams {
  layoutOffset: number
  firstPageType: 'single' | 'double'
  bodyPageType: 'single' | 'double'
  lastPageType: 'single' | 'double'
}

export type CatalogType = 'accessories' | 'marmista'

export const catalogApi = {
  /** Lista cataloghi con stato split */
  list: () =>
    api.get<{ data: CatalogStatus[] }>(base).then(r => r.data.data),

  /** Carica PDF + layout, avvia split in background. Ritorna 202. */
  upload: (type: CatalogType, file: File, layout: CatalogLayoutParams, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('type', type)
    form.append('file', file)
    form.append('layoutOffset', String(layout.layoutOffset))
    form.append('firstPageType', layout.firstPageType)
    form.append('bodyPageType', layout.bodyPageType)
    form.append('lastPageType', layout.lastPageType)
    return api.post<CatalogStatus>(base, form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    }).then(r => r.data)
  },

  /** Polling stato split */
  status: (type: CatalogType) =>
    api.get<CatalogStatus>(`${base}/${type}/status`).then(r => r.data),

  /** Aggiorna solo il layout senza re-upload */
  updateLayout: (type: CatalogType, layout: CatalogLayoutParams) =>
    api.put<CatalogStatus>(`${base}/${type}/layout`, layout).then(r => r.data),

  /** Elimina catalogo e pagine splittate */
  remove: (type: CatalogType) =>
    api.delete(`${base}/${type}`),
}

/** Endpoint pubblico — usato dal viewer client */
export const catalogPublicApi = {
  layout: (type: CatalogType) =>
    api.get<CatalogLayoutPublic>(`/public/catalog/${type}/layout`).then(r => r.data),
}
