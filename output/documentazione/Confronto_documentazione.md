# Confronto e allineamento della documentazione BugBoard26

La revisione segue le **4 parti, 12 capitoli e 86 voci di indice** di BugBoard26_Overleaf.pdf, nello stesso ordine. Nessuna voce del suo indice è stata eliminata. I contenuti sono verificati sui sorgenti correnti; nessuna modifica al codice applicativo è stata effettuata per questa revisione.

## Materiale recuperato

- Tutte le 27 figure interne del collega, oltre al marchio di copertina: personas, casi d’uso, mockup, dominio, DTO, design frontend, Utility/Config/Security e navigazione USER/ADMIN.
- I diagrammi frontend e navigazione sono stati recuperati dalle immagini incorporate nel PDF. Alcuni erano tagliati dalla sua impaginazione; la revisione usa le immagini complete alla risoluzione originale.
- Il diagramma frontend completo è accompagnato da quattro ritagli ingranditi della stessa immagine, senza nuovi disegni sostitutivi.
- Le schermate reali dell’app sono affiancate ai mockup nei flussi principali. Sono distinte dalle proposte progettuali.
- Le specifiche delle quattro funzioni del capitolo 11 e le sottosezioni della valutazione di usabilità sono mantenute.

## Differenze rispetto ai sorgenti attuali

| Sezione | Materiale mantenuto | Allineamento effettuato | Evidenza nel codice |
| --- | --- | --- | --- |
| 4 Requisiti | Identificativi RF1-RF28 e UC1-UC4 | Immagine implementata; solo assegnatario può cambiare stato; membership confermata come regola del progetto | `backend/src/services/issues.js`, `controllers/issues.controller.js`, `services/access.js` |
| 4.1 Use Case Diagram | Figura originale | Collegamento ADMIN al cambio stato valido soltanto se assegnatario; abbandono/eliminazione progetto non implementati | `routes.js`, `changeStatus` |
| 5.4 Tecnologie | Schema originale | Spring/JPA/storage esterno sono progettazione storica; attuali Express/Sequelize/PostgreSQL e allegati BYTEA | package.json, `models/index.js`, `services/images.js` |
| 5.5 Persistenza | Diagramma di dominio | Sette modelli; IssueImage 0..1; CLOSED invece di DONE; CRITICAL e priorità nullable; nessun ISSUE_HISTORY | `backend/src/models/index.js`, SQL 001-003 |
| 6 UI design | Tutte le sottosezioni e figure originali | Palette e font dal CSS; quote 60-30-10 come guida e non misura; nessuna conformità WCAG certificata | `frontend/src/index.css` |
| 7.1.2 DTO | Diagramma Request/Domain/Response | DTO come contratti JSON, non classi Java; mapping di ogni oggetto al formato reale; aggiunti expiresAt, image, errori e aggiornamento assegnatario | `controllers/`, `services/responses.js`, `frontend/src/api/` |
| 7.1.2 DTO | Nomi progettuali di profilo e membership | UpdateProfile non implementato; rimozione membro via parametri URL; nessun ruolo per progetto; attachmentUrl sostituito dal multipart e download privato | `routes.js`, `members.controller.js`, `issuesApi.js` |
| 7.2 Design frontend | Diagramma completo e ingrandimenti | ProtectedRoute corrisponde a RouteGuard; creazione in modale; alcuni componenti sono incorporati nelle pagine; IssueImage è successivo al disegno | `router/AppRouter.jsx`, `components/`, `pages/` |
| 7.2.1 Utility, Config, Security | Diagramma originale | Moduli effettivi, Bearer, localStorage, ripristino sessione e polling; profileApi presente ma senza endpoint operativo | `security/`, `config/`, `context/AuthContext.jsx` |
| 7.3 Navigazione | Diagrammi USER e ADMIN | Percorsi reali, redirect alla modale, profilo placeholder e verifica ADMIN | `routeConfig.js`, `AppRouter.jsx`, `UserManagementPage.jsx` |
| 7.4 Sequenze | Tutte e quattro le sezioni | Passi testuali dei flussi reali; nel PDF di riferimento non ci sono diagrammi di sequenza da estrarre | controller, servizi e adapter API |
| 8 Build | Tutte e tre le sezioni | Dockerfile frontend assente; SQL 001-003 espliciti; comandi verificati rispetto ai file realmente disponibili | Dockerfile, Compose, `schema.js`, package.json |
| 9 Git | Capitolo mantenuto | Remoto e cronologia verificabili nel repository; immagini e nuovi test ancora nel lavoro locale successivo a 1cf16c6 | git log e git status |
| 10 Qualità | 10.1, 10.2 e 10.3 mantenute | Nessun grafico inventato; duplicazione, report statici e coverage percentuale non disponibili | configurazioni attuali |
| 11 Testing | Quattro funzioni, strategie e test plan | 52 test backend e 17 frontend; distinzione test API e specifiche unit di isolamento; nessuna coverage dichiarata | `backend/test/api.test.js`, `frontend/test/` |
| 12 Usabilità | Tutte le sottosezioni | Protocollo, checklist e questionario; risultati e partecipanti da aggiungere dopo le prove | attività sperimentali da svolgere |

## Questioni da completare prima della consegna

1. I diagrammi storici sono conservati e commentati; per far coincidere ogni casella con l’implementazione corrente occorrerà aggiornare i loro sorgenti UML originali. In questa revisione non sono stati ridisegnati.
2. Confermare con il docente il framework ammesso per il requisito xUnit ed eventualmente implementare le specifiche unitarie isolate. I test backend presenti sono prevalentemente integrativi.
3. Inserire misure reali di duplicazione/analisi statica/coverage se richieste tra gli artefatti del corso. Le relative sezioni sono presenti e dichiarano le misure mancanti.
4. Aggiungere nomi degli autori e risultati reali di expert review e sessioni con utenti. Gruppo e matricole provengono dalla copertina del collega.
5. Identificare il commit o lo ZIP finale che includa immagini e nuovi test, attualmente successivi all’ultimo commit indicato nella relazione.

## Controllo delle sezioni

La corrispondenza seguente è verificata automaticamente per titolo, ordine e profondità delle voci. Le pagine cambiano perché la revisione rende completi e leggibili i diagrammi e aggiunge il confronto con il codice.

| Voce del riferimento | Titolo nella revisione | Esito |
| --- | --- | --- |
| I Documento dei Requisiti Software | Parte I  Documento dei Requisiti Software | Presente |
| Glossario | 1 Glossario | Presente |
| Introduzione | 2 Introduzione | Presente |
| Requirement Elicitation and Analysis | 3 Requirement Elicitation and Analysis | Presente |
| Individuazione del target degli utenti tramite Personas | 3.1 Individuazione del target degli utenti tramite Personas | Presente |
| Requirement Specification | 4 Requirement Specification | Presente |
| Use Case Diagram | 4.1 Use Case Diagram | Presente |
| Requisiti Funzionali | 4.2 Requisiti Funzionali | Presente |
| Requisiti Non Funzionali | 4.3 Requisiti Non Funzionali | Presente |
| Requisiti di Dominio | 4.4 Requisiti di Dominio | Presente |
| Rappresentazione Tabellare Modello di A.Cockburn | 4.5 Rappresentazione Tabellare Modello di A.Cockburn | Presente |
| II Documento di Design del Sistema | Parte II  Documento di Design del Sistema | Presente |
| Progettazione Architetturale e Scelte Tecnologiche | 5 Progettazione Architetturale e Scelte Tecnologiche | Presente |
| Descrizione dell’Architettura | 5.1 Descrizione dell’Architettura | Presente |
| Controller | 5.1.1 Controller | Presente |
| Service | 5.1.2 Service | Presente |
| Model e accesso ai dati | 5.1.3 Model e accesso ai dati | Presente |
| Architettura del Frontend | 5.2 Architettura del Frontend | Presente |
| Criteri di Design e Motivazioni | 5.3 Criteri di Design e Motivazioni | Presente |
| Tecnologie Utilizzate | 5.4 Tecnologie Utilizzate | Presente |
| Schema della Persistenza dei Dati | 5.5 Schema della Persistenza dei Dati | Presente |
| Descrizione delle entità e delle relazioni | 5.5.1 Descrizione delle entità e delle relazioni | Presente |
| Design dell'interfaccia utente | 6 Design dell’interfaccia utente | Presente |
| Progettazione Cromatica dell’Interfaccia | 6.1 Progettazione Cromatica dell’Interfaccia | Presente |
| Obiettivi della Progettazione Cromatica | 6.1.1 Obiettivi della Progettazione Cromatica | Presente |
| Palette Cromatica Adottata | 6.1.2 Palette Cromatica Adottata | Presente |
| Applicazione della Regola 60–30–10 | 6.1.3 Applicazione della Regola 60–30–10 | Presente |
| Accessibilità e Contrasto Cromatico | 6.1.4 Accessibilità e Contrasto Cromatico | Presente |
| Tipografia | 6.2 Tipografia | Presente |
| Obiettivi della Progettazione Tipografica | 6.2.1 Obiettivi della Progettazione Tipografica | Presente |
| Scelta del Font | 6.2.2 Scelta del Font | Presente |
| Gerarchia Tipografica | 6.2.3 Gerarchia Tipografica | Presente |
| Spaziatura e Allineamento | 6.2.4 Spaziatura e Allineamento | Presente |
| Accessibilità e Conformità alle WCAG | 6.2.5 Accessibilità e Conformità alle WCAG | Presente |
| Coerenza con l’Identità Visiva | 6.2.6 Coerenza con l’Identità Visiva | Presente |
| Principles of Proximity and Connectedness | 6.3 Principles of Proximity and Connectedness | Presente |
| Applicazione del modello F-Pattern | 6.4 Applicazione del modello F-Pattern | Presente |
| Labor Perception Bias | 6.5 Labor Perception Bias | Presente |
| Gestione del Feedback Utente e Feedback Persistence | 6.6 Gestione del Feedback Utente e Feedback Persistence | Presente |
| Prevenire gli Errori | 6.7 Prevenire gli Errori | Presente |
| Diagrammi delle classi di Design | 7 Diagrammi delle classi di Design | Presente |
| Classi di Design del Backend | 7.1 Classi di Design del Backend | Presente |
| Architettura Controller–Service–Model | 7.1.1 Architettura Controller–Service–Model | Presente |
| DTO | 7.1.2 DTO | Presente |
| Entità di Dominio e sicurezza | 7.1.3 Entità di Dominio e sicurezza | Presente |
| Classi di Design del Frontend | 7.2 Classi di Design del Frontend | Presente |
| Utility, Config e Security | 7.2.1 Utility, Config e Security | Presente |
| Gestione della navigazione tra le pagine | 7.3 Gestione della navigazione tra le pagine | Presente |
| Sequenze di Design per gli Use Case | 7.4 Sequenze di Design per gli Use Case | Presente |
| UC1 – Creazione issue | 7.4.1 UC1 – Creazione issue | Presente |
| UC2 – Cambio stato | 7.4.2 UC2 – Cambio stato | Presente |
| UC3 – Commento | 7.4.3 UC3 – Commento | Presente |
| UC4 – Creazione account e appartenenza | 7.4.4 UC4 – Creazione account e appartenenza | Presente |
| III Documentazione del Processo di Sviluppo | Parte III  Documentazione del Processo di Sviluppo | Presente |
| File di build automatica | 8 File di build automatica | Presente |
| DockerFile (Backend) | 8.1 DockerFile (Backend) | Presente |
| DockerFile (Frontend) | 8.2 DockerFile (Frontend) | Presente |
| Docker Compose | 8.3 Docker Compose | Presente |
| Strumento di Versioning | 9 Strumento di Versioning | Presente |
| Qualità del codice | 10 Qualità del codice | Presente |
| Grafico di Duplicazione del Codice | 10.1 Grafico di Duplicazione del Codice | Presente |
| Grafico delle Issues | 10.2 Grafico delle Issues | Presente |
| Grafico della Coverage dei Test | 10.3 Grafico della Coverage dei Test | Presente |
| IV Testing e Valutazione dell’Usabilità | Parte IV  Testing e Valutazione dell’Usabilità | Presente |
| Unit Testing | 11 Unit Testing | Presente |
| Test di createIssue (issues service) | 11.1 Test di createIssue (issues service) | Presente |
| Test di changeStatus (issues service) | 11.2 Test di changeStatus (issues service) | Presente |
| Test di requireAssignee (access service) | 11.3 Test di requireAssignee (access service) | Presente |
| Test di notify (notifications service) | 11.4 Test di notify (notifications service) | Presente |
| Strategie adottate | 11.5 Strategie adottate | Presente |
| Controller | 11.5.1 Controller | Presente |
| Service | 11.5.2 Service | Presente |
| Model / persistenza | 11.5.3 Model / persistenza | Presente |
| Security e Utils | 11.5.4 Security e Utils | Presente |
| Test plan di una funzionalità: risoluzione issue | 11.6 Test plan di una funzionalità: risoluzione issue | Presente |
| Valutazione dell’Usabilità | 12 Valutazione dell’Usabilità | Presente |
| Expert Review | 12.1 Expert Review | Presente |
| Obiettivo del Test | 12.1.1 Obiettivo del Test | Presente |
| Istruzioni per l’Uso della Checklist | 12.1.2 Istruzioni per l’Uso della Checklist | Presente |
| Risultati | 12.1.3 Risultati | Presente |
| Relazione Sperimentale | 12.2 Relazione Sperimentale | Presente |
| Descrizione dei Partecipanti | 12.2.1 Descrizione dei Partecipanti | Presente |
| Procedura Sperimentale | 12.2.2 Procedura Sperimentale | Presente |
| Dati Raccolti | 12.2.3 Dati Raccolti | Presente |
| Valutazione post-task | 12.2.4 Valutazione post-task | Presente |
| Conclusioni | 12.2.5 Conclusioni | Presente |
