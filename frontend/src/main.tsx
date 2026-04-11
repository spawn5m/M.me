import React from 'react'
import { createRoot } from 'react-dom/client'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import it from './locales/it.json'
import App from './App.tsx'
import './index.css'

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: 'it',
    fallbackLng: 'it',
    // Il bundle statico serve come fallback se l'API non risponde
    resources: {
      it: { translation: it },
    },
    partialBundledLanguages: true,
    backend: {
      loadPath: '/api/public/locales/{{lng}}',
    },
    interpolation: {
      escapeValue: false,
    },
  })

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
