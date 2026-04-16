# Global Maintenance homeH2 Design
**Data:** 2026-04-16

---

## Contesto

La schermata di manutenzione totale dark mostra oggi il wordmark `MIRIGLIANI` e il messaggio principale `maintenance.home`.
E' stata aggiunta una nuova chiave locale `maintenance.homeH2` che deve essere resa visibile solo nella variante dark della manutenzione globale.

---

## Obiettivo

Mostrare `maintenance.homeH2` nella manutenzione totale dark come sottotitolo intermedio, prima del testo `maintenance.home`.

Ordine finale del contenuto:
- `home.headline` come titolo principale `h1`
- `maintenance.homeH2` come `h2`
- `maintenance.home` come testo descrittivo

---

## Ambito

Cambiare solo la variante `dark` di `frontend/src/components/layout/PublicMaintenanceScreen.tsx`.

La variante `light` delle maintenance interne resta invariata.

---

## UI

`maintenance.homeH2` usa una gerarchia visiva secondaria rispetto a `MIRIGLIANI`, restando coerente con il sistema dark della Home:
- testo bianco o quasi bianco;
- uppercase;
- tracking ampio;
- centrato;
- posizionato tra headline e body copy.

Non cambia la struttura delle CTA esistenti.

---

## Verifica

- nella maintenance totale dark compare `maintenance.homeH2` tra `MIRIGLIANI` e `maintenance.home`;
- la maintenance light resta invariata;
- test frontend aggiornato per coprire il nuovo `h2`.
