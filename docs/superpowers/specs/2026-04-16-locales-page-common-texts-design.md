# Locales Page Common Texts Design
**Data:** 2026-04-16

---

## Contesto

La pagina admin `Interfaccia > Testi` permette di modificare solo un sottoinsieme delle chiavi locali mappate manualmente in `LocalesPage.tsx`.
Le nuove chiavi introdotte per la schermata di manutenzione globale non sono ancora esposte nel backoffice sotto `Comuni`.

---

## Obiettivo

Rendere modificabili da `Interfaccia > Testi > Comuni` entrambe queste chiavi:
- `common.contactUs`
- `maintenance.home`

L'obiettivo e' poter gestire da admin sia il testo del pulsante `Contattaci` sia il messaggio della manutenzione globale, senza intervenire direttamente su `frontend/src/locales/it.json`.

---

## UI Admin

La sezione `Comuni` di `frontend/src/pages/admin/LocalesPage.tsx` viene estesa con due nuovi sottogruppi:

- `Azioni comuni`
  - `common.contactUs` con label `Pulsante Contattaci`
- `Manutenzione`
  - `maintenance.home` con label `Messaggio manutenzione globale`
  - campo multilinea, perche' il contenuto e' una frase completa

Le sezioni esistenti (`Navigazione`, `Footer`, `Autenticazione`, `Messaggi di errore`) restano invariate.

---

## Comportamento

Non sono richiesti cambi backend.
`LocalesPage` carica gia' il JSON completo da `/api/public/locales/it` e salva gia' l'intero payload verso `/api/admin/locales`, quindi basta aggiornare la configurazione `SECTIONS`.

---

## Impatto Tecnico

File attesi:
- `frontend/src/pages/admin/LocalesPage.tsx`
- nuovo test della pagina admin, dato che oggi non esiste una copertura dedicata per questa schermata

Non sono richiesti cambi a `it.json`, a meno di aggiornare i dati locali gia' presenti separatamente.

---

## Verifica

- in `Interfaccia > Testi > Comuni` compaiono i campi `Pulsante Contattaci` e `Messaggio manutenzione globale`;
- `Messaggio manutenzione globale` usa una textarea;
- il salvataggio continua a passare dal payload completo senza regressioni sulle altre sottosezioni;
- test frontend dedicato verde.
