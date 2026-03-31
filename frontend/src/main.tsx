import React from 'react'
import { createRoot } from 'react-dom/client'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import it from './locales/it.json'
import App from './App.tsx'
import './index.css'

i18n.use(initReactI18next).init({
  lng: 'it',
  fallbackLng: 'it',
  resources: {
    it: { translation: it }
  },
  interpolation: {
    escapeValue: false
  }
})

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
