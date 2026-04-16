# Global Maintenance Home-Style Design
**Data:** 2026-04-16

---

## Contesto

La manutenzione globale attuale blocca tutto il sito pubblico mostrando una schermata dark minimale.
L'obiettivo e' renderla coerente con il linguaggio visivo della Home, mantenendo il tono editoriale scuro del brand e aggiungendo due CTA utili durante il downtime.

---

## Obiettivo

Quando la manutenzione globale e' attiva:
- il visitatore vede una schermata nello stile Home dark editorial;
- il testo principale e' localizzato in italiano nella sezione comune `maintenance.home`;
- sono presenti due azioni: `Area Riservata` e `Contattaci`;
- `Contattaci` apre il client email con `mailto:info@mirigliani.me`.

La manutenzione delle pagine interne resta invariata.

---

## UI

La variante `dark` di `PublicMaintenanceScreen` resta il punto di rendering per la manutenzione globale.
La schermata viene aggiornata con questi principi:
- sfondo `#071325`, testo bianco e testo secondario `#8A9BB5`;
- wordmark/logo e headline `MIRIGLIANI` come richiamo diretto alla Home;
- messaggio centrale con larghezza contenuta e tono editoriale;
- pulsanti sharp, outlined, uppercase, tracking ampio, senza border radius;
- layout centrato e responsivo, con CTA impilate su mobile e affiancate su viewport piu' ampi.

---

## Contenuti

La chiave `maintenance.home` viene aggiornata con un messaggio piu' caldo e orientato al rilancio del sito:

`Stiamo lavorando per migliorare il sito. Torneremo presto con grandi novita'.`

Il testo vive in locale nel file di traduzione italiano, cosi' la schermata continua a dipendere da i18n e non da stringhe hardcoded nel componente.

---

## CTA

- `Area Riservata`: continua a usare `getDefaultRoute(user, permissions)`.
- `Contattaci`: nuovo link `mailto:info@mirigliani.me` con label localizzata.

Le CTA sono visibili solo nella manutenzione globale dark. Nessun cambiamento per la variante `light`.

---

## Impatto Tecnico

File attesi:
- `frontend/src/components/layout/PublicMaintenanceScreen.tsx`
- `frontend/src/locales/it.json`
- eventuali test della schermata/layout manutenzione pubblica

Non sono richieste modifiche backend.

---

## Verifica

- manutenzione globale attiva: schermata dark aggiornata con entrambe le CTA;
- `Area Riservata` continua a navigare correttamente;
- `Contattaci` apre `mailto:info@mirigliani.me`;
- manutenzione pagina singola interna resta invariata;
- nessuna regressione nei test frontend toccati.
