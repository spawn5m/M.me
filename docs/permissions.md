# Catalogo Permessi

Panoramica di tutti i permessi di sistema, organizzati per area funzionale.

---

## Dashboard

| Permesso | Cosa fa |
|---|---|
| `dashboard.admin.read` | Accesso alla dashboard admin con metriche e statistiche |
| `dashboard.client.read` | Accesso alla dashboard area cliente |

---

## Utenti

| Permesso | Cosa fa |
|---|---|
| `users.read.team` | Vedere gli utenti nel proprio perimetro |
| `users.read.all` | Vedere tutti gli utenti — include `.team` |
| `users.create` | Creare nuovi utenti |
| `users.update.team` | Modificare utenti nel proprio perimetro |
| `users.update.all` | Modificare qualsiasi utente — include `.team` |
| `users.disable` | Disattivare/riattivare account utenti |
| `users.assign_manager` | Assegnare il manager di riferimento a un utente |
| `users.assign_pricelist` | Assegnare listini di vendita a utenti cliente |
| `users.super_admin.read` | Vedere il super admin nella lista utenti (normalmente nascosto) |

### Permessi esclusivi (superseded)

Se si assegna `users.read.all`, il permesso `users.read.team` è ridondante.
Se si assegna `users.update.all`, il permesso `users.update.team` è ridondante.

---

## Macro User

Flag dichiarativi — non rappresentano azioni ma proprietà dell'utente.

| Permesso | Cosa fa |
|---|---|
| `users.is_super_admin` | Marca l'utente come super admin. Un solo utente alla volta. Non compare nella lista utenti a meno di avere `users.super_admin.read` |
| `user.isManager` | Indica che l'utente può essere scelto come manager da assegnare ad altri. Senza questo permesso non compare nel selettore manager |

---

## Ruoli

| Permesso | Cosa fa |
|---|---|
| `roles.read` | Vedere la lista ruoli e i permessi assegnati |
| `roles.manage` | Creare, modificare, eliminare ruoli custom e assegnare permessi |

---

## Articoli — Cofani

| Permesso | Cosa fa |
|---|---|
| `articles.coffins.read` | Vedere la lista cofani |
| `articles.coffins.write` | Creare e modificare cofani |
| `articles.coffins.delete` | Eliminare cofani |
| `articles.coffins.import` | Importare cofani da Excel |
| `articles.coffins.upload_image` | Caricare immagini per i cofani |

---

## Articoli — Accessori

| Permesso | Cosa fa |
|---|---|
| `articles.accessories.read` | Vedere la lista accessori |
| `articles.accessories.write` | Creare e modificare accessori |
| `articles.accessories.delete` | Eliminare accessori |
| `articles.accessories.import` | Importare accessori da Excel |

---

## Articoli — Marmista

| Permesso | Cosa fa |
|---|---|
| `articles.marmista.read` | Vedere articoli marmista |
| `articles.marmista.write` | Creare e modificare articoli marmista |
| `articles.marmista.delete` | Eliminare articoli marmista |
| `articles.marmista.import` | Importare articoli marmista da Excel |

---

## Lookup e Misure

| Permesso | Cosa fa |
|---|---|
| `lookups.read` | Vedere categorie e lookup (es. tipi cofano) |
| `lookups.manage` | Creare, modificare, eliminare lookup |
| `measures.read` | Vedere misure cofani |
| `measures.manage` | Creare, modificare, eliminare misure |

---

## Listini Vendita

| Permesso | Cosa fa |
|---|---|
| `pricelists.sale.read` | Vedere i listini di vendita |
| `pricelists.sale.write` | Creare e modificare listini di vendita |
| `pricelists.sale.delete` | Eliminare listini di vendita |
| `pricelists.sale.assign` | Assegnare listini di vendita agli utenti cliente |
| `pricelists.sale.preview` | Vedere i prezzi calcolati in anteprima — serve anche ai manager per vedere i prezzi nel catalogo pubblico |
| `pricelists.sale.recalculate` | Rigenerare snapshot prezzi dopo una modifica regole |

---

## Listini Acquisto

| Permesso | Cosa fa |
|---|---|
| `pricelists.purchase.read` | Vedere i listini di acquisto (costi interni) |
| `pricelists.purchase.write` | Creare e modificare listini di acquisto |
| `pricelists.purchase.delete` | Eliminare listini di acquisto |
| `pricelists.purchase.preview` | Vedere i prezzi di acquisto in anteprima |
| `pricelists.purchase.recalculate` | Ricalcolare snapshot listini di acquisto |

---

## Catalogo PDF

| Permesso | Cosa fa |
|---|---|
| `catalog.pdf.read` | Vedere stato e metadati del catalogo PDF caricato |
| `catalog.pdf.write` | Caricare o sostituire il file PDF del catalogo |

---

## Interfaccia e Configurazione

| Permesso | Cosa fa |
|---|---|
| `branding.logo.manage` | Caricare o eliminare il logo aziendale |
| `maps.manage` | Gestire coordinate sedi e link Google Maps pubblici |
| `locales.manage` | Modificare i testi del sito (file i18n) |
| `maintenance.manage` | Attivare la modalità manutenzione e cambiarne i messaggi |

---

## Area Cliente

Permessi usati nell'area riservata cliente. Un utente cliente non dovrebbe mai avere permessi `users.*` o `articles.*`.

| Permesso | Cosa fa |
|---|---|
| `client.profile.read` | Vedere il proprio profilo e i listini collegati |
| `client.password.change` | Cambiare la propria password |
| `client.catalog.funeral.read` | Consultare il catalogo cofani con i prezzi del listino assegnato |
| `client.catalog.marmista.read` | Consultare il catalogo marmista con i prezzi del listino assegnato |

---

## Note

- I permessi `pricelists.purchase.*` non vanno mai assegnati a utenti cliente.
- `users.is_super_admin` è unico nel sistema — assegnarlo a un secondo utente restituisce 409.
- `user.isManager` non dà nessun accesso aggiuntivo — serve solo a comparire nel selettore manager.
- I permessi `client.*` e i permessi admin vivono su aree separate e non si sovrappongono.
