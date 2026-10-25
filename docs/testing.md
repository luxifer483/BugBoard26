# Attivita di testing

Questo testo raccoglie il test plan, i quattro metodi scelti e la progettazione dei relativi test. E materiale per il capitolo di testing della documentazione unica del progetto; i precedenti PDF non sono stati rigenerati con questo intervento.

## 1. Obiettivi e strumenti

Il backend utilizza QUnit 2.26 per tutti i test automatici. La suite verifica il comportamento corrente dell'applicazione. Comprende 34 test unitari per quattro metodi non banali, ciascuno con almeno due parametri effettivi, e 4 test unitari sulle immagini. Non vengono contati come parametri distinti i campi di un oggetto.

La suite backend comprende 95 test: 38 unitari e 57 di integrazione. I test React restano in Vitest e costituiscono una verifica aggiuntiva dell'interfaccia. QUnit e il framework che esegue i test; white-box e R-WECT sono invece criteri usati per scegliere i casi.

Gli unit test chiamano direttamente il metodo da verificare. Nei test di accesso e notifiche le operazioni dei modelli Sequelize vengono sostituite con risposte controllate, registrando le richieste ricevute. `afterEach` ripristina i metodi originali anche in caso di test fallito. Non viene eseguito SQL. Nei test delle password e delle immagini sono utilizzate le vere librerie BCrypt e Sharp.

I test di integrazione avviano Express su una porta temporanea, inviano vere richieste HTTP con JWT firmati e usano PostgreSQL 17. Ogni esecuzione crea uno schema casuale e le tabelle dai modelli con `sequelize.sync()`; ogni caso prepara account e progetto propri. Il comando `test-docker.ps1` crea anche un database in un container temporaneo e lo rimuove alla fine. Il database di sviluppo non viene usato.

### Disposizione dei test

| File | Tipo | Numero | Oggetto e criterio |
| --- | --- | ---: | --- |
| `backend/test/unit/requireProject.test.js` | Unitario | 5 | Accesso ai progetti, white-box |
| `backend/test/unit/requireAssignee.test.js` | Unitario | 7 | Controllo assegnatario, white-box |
| `backend/test/unit/matchesPassword.test.js` | Unitario | 11 | Confronto password, R-WECT e valori limite |
| `backend/test/unit/notify.test.js` | Unitario | 11 | Selezione destinatari e richiesta di salvataggio, white-box |
| `backend/test/unit/images.test.js` | Unitario aggiuntivo | 4 | Decodifica e controlli delle immagini; il metodo ha un solo parametro e non e tra i quattro scelti |
| `backend/test/integration/api.test.js` | Integrazione | 57 | API, autenticazione, permessi, transizioni, persistenza, concorrenza e rollback |
| `frontend/test/*.test.js` e `*.test.jsx` | Componenti e moduli frontend | 55, suite Vitest separata | Rendering, interazioni, azioni consentite, sessione e contratti HTTP con risposte simulate |

`backend/test/setup.js` prepara soltanto ambiente e configurazione QUnit: non contiene casi di test. Sopra ciascun test backend e presente un commento che ne descrive lo scopo.

## 2. Test plan: assegnazione e avanzamento di una issue

**Identificatore:** TP-ISSUE-01. **Funzionalita:** assegnare una issue a un membro e consentire al solo assegnatario di avanzarne lo stato, notificando il reporter alla chiusura.

**Ambito:** API di assegnazione e cambio stato, controlli di accesso, notifica di risoluzione e atomicita delle scritture. L'ispezione visuale e le prove con utenti appartengono alla valutazione di usabilita e non sono dimostrate da questi test.

**Ambiente:** Node.js 22 o successivo, dipendenze del lockfile, Express e PostgreSQL 17 temporaneo. QUnit esegue i casi in sequenza; dove e necessario simulare concorrenza un singolo caso invia due richieste tramite `Promise.all`.

**Condizioni iniziali:** progetto esistente; account ADMIN; due membri USER e un USER esterno; JWT validi; issue inizialmente TODO. Il reporter e l'assegnatario vengono scelti per lo scenario specifico. I dati sono nuovi per ogni test.

**Operazioni:** `PATCH /api/issues/:id/assignee`, `PATCH /api/issues/:id/status`, lettura dettaglio e notifiche. Il corpo del cambio stato contiene `status`; l'identita di chi agisce proviene dal JWT.

| Caso del piano | Azione e condizioni | Risultato atteso | Test di integrazione corrispondente, identificato dal titolo |
| --- | --- | --- | --- |
| TP01 | L'assegnatario avanza TODO -> IN_PROGRESS -> CLOSED | HTTP 200 e stato salvato; richieste ripetute non duplicano gli eventi | `the assignee can advance status with the existing transitions and idempotency` |
| TP02 | Reporter o ADMIN non assegnato tenta il cambio stato | HTTP 403 NOT_ISSUE_ASSIGNEE; dati e notifiche invariati | `only the assignee can update status, including when the reporter or an admin is a project member` |
| TP03 | Si tenta il cambio di una issue non assegnata, poi la si assegna | Prima HTTP 403; il nuovo assegnatario puo avanzare | `unassigned issues cannot change status until an assignee is chosen` |
| TP04 | ADMIN cambia assegnatario o rimuove l'assegnazione | Il precedente assegnatario perde immediatamente il permesso | `reassignment and unassignment immediately change who can update status` |
| TP05 | ADMIN sceglie un assegnatario esterno o inesistente | HTTP 400 ASSIGNEE_NOT_MEMBER oppure 404 | `assignee must belong to the project, including administrator accounts` |
| TP06 | Si salta TODO -> CLOSED oppure si tenta CLOSED -> TODO | HTTP 409 INVALID_STATUS_TRANSITION | `the assignee can advance status with the existing transitions and idempotency` |
| TP07 | Un reporter chiude la issue assegnata a se stesso | Una sola notifica di risoluzione anche ripetendo la richiesta | `resolution notifies a reporter who closes their own assigned issue exactly once` |
| TP08 | Il reporter ha lasciato il progetto prima della chiusura | Riceve la notifica, senza link alla issue e senza riottenere accesso | `former reporters receive and read resolution notices without regaining project access` |
| TP09 | Due richieste di chiusura arrivano contemporaneamente | Una sola notifica di risoluzione per il reporter | `concurrent closures emit a single resolution notice per reporter` |
| TP10 | Fallisce il salvataggio della notifica di risoluzione | HTTP 500; stato IN_PROGRESS e data del progetto conservati | `resolution notification failure rolls back closure and project timestamp` |
| TP11 | Si revoca l'appartenenza di un assegnatario | Le modifiche successive ricevono HTTP 403 | `membership removal revokes issue/comment access and hides notifications immediately` |
| TP12 | USER crea una issue con assegnatario facoltativo | Libera o assegnata a se stesso: HTTP 201; altro membro: HTTP 403, anche multipart | `USER creation allows no assignee or self and rejects another member in JSON and multipart` |
| TP13 | USER autoassegna una issue libera | HTTP 200; acquisisce il permesso di cambiare stato | `a project member can claim an unassigned issue and then change status` |
| TP14 | USER tenta di assegnare ad altri, rimuovere o modificare un'assegnazione esistente | HTTP 403 per destinazione vietata; HTTP 409 ISSUE_ALREADY_ASSIGNED per autoassegnazione su issue occupata; nessuna scrittura | `USER assignment restrictions preserve the issue, project activity and notifications` |
| TP15 | USER esterno tenta di autoassegnarsi | HTTP 403; issue ancora libera | `a nonmember cannot claim an unassigned issue` |
| TP16 | Due USER autoassegnano contemporaneamente la stessa issue | Un HTTP 200, un HTTP 409; il vincitore rimane assegnatario | `concurrent self-assignment has one winner and never overwrites the first assignment` |
| TP17 | Fallisce una notifica durante l'assegnazione ADMIN | HTTP 500; assegnatario e data progetto conservati | `a failed assignment notification rolls back the assignment and project timestamp` |
| TP18 | Due ADMIN gestiscono progetti, account, membri e assegnazioni | Stessi poteri globali per entrambi | `all administrators share the same global project and account permissions` |
| TP19 | Il creatore ADMIN viene rimosso dai membri | La membership viene rimossa, ma l'accesso globale ADMIN resta valido | `a project creator can leave the team without losing global ADMIN access` |
| TP20 | Il reporter ADMIN risolve una issue in un progetto creato da un altro ADMIN | Solo il reporter riceve la risoluzione; il creatore non viene avvisato automaticamente | `an ADMIN reporter receives resolution without notifying the project creator` |

**Criteri di superamento:** esiti HTTP e codici applicativi attesi; corrispondenza dei dati JSON e dei dati persistiti; assenza di scritture dopo rifiuti; notifica unica; rollback verificato su issue e progetto. Tutti i casi devono passare, senza casi saltati o `todo`.

**Procedura:** installare le dipendenze, eseguire il comando Docker indicato nella sezione 5, esaminare esiti e report. Una mancata connessione al database e un errore di preparazione, non un test superato. Non sono previste chiamate a servizi esterni.

## 3. Progettazione dei test unitari dei quattro metodi

### 3.1 requireProject(user, projectId, transaction)

**Sorgente:** `backend/src/services/access.js`. **Test:** `backend/test/unit/requireProject.test.js`. I primi due parametri sono dati funzionali; `transaction` permette di usare la stessa transazione dell'operazione chiamante.

**Strategia white-box:** attraversare i due esiti del controllo di esistenza e le combinazioni rilevanti di ruolo e appartenenza. Il controllo `role !== ADMIN && !membership` richiede un caso ADMIN, nel quale la membership non viene letta, e due casi USER con membership presente e assente. Oltre al risultato, i test verificano quali letture siano state richieste e la transazione passata ai modelli.

| Test | Condizione | Esito atteso |
| --- | --- | --- |
| RP01 | Progetto inesistente | Errore 404, nessuna lettura dei membri |
| RP02 | Progetto esistente, ADMIN | Progetto restituito, controllo membership evitato |
| RP03 | Progetto esistente, USER membro | Progetto restituito, ricerca per progetto e utente corretti |
| RP04 | Progetto esistente, USER esterno | Errore 403 |
| RP05 | Lettura progetto fallita | Errore originale propagato, nessun accesso consentito |

### 3.2 requireAssignee(projectId, userId, transaction)

**Sorgente:** `backend/src/services/access.js`. **Test:** `backend/test/unit/requireAssignee.test.js`.

**Strategia white-box:** percorrere i ritorni e gli errori associati ad assegnatario assente, utente inesistente, membership assente e assegnatario valido. I casi ADMIN verificano inoltre che un ruolo globale non sostituisca l'appartenenza richiesta per ricevere un'assegnazione.

| Test | Condizione | Esito atteso |
| --- | --- | --- |
| RA01 | userId null | null, senza letture |
| RA02 | Utente inesistente | Errore 404, senza ricerca membership |
| RA03 | USER esistente non membro | Errore 400 ASSIGNEE_NOT_MEMBER |
| RA04 | USER membro | Utente restituito, letture nella transazione ricevuta |
| RA05 | ADMIN non membro | Errore 400 ASSIGNEE_NOT_MEMBER |
| RA06 | ADMIN membro | Utente restituito |
| RA07 | Lettura membership fallita | Errore originale propagato |

### 3.3 matchesPassword(value, hash)

**Sorgente:** `backend/src/services/auth.js`. **Test:** `backend/test/unit/matchesPassword.test.js`.

**Strategia:** classi di equivalenza con criterio robust weak (R-WECT), integrate da casi sui valori limite. La funzione confronta una password con un hash gia memorizzato: non e la funzione che impone la lunghezza minima di registrazione. Quel controllo e in `validation.password` ed e verificato anche attraverso le API.

Il dominio considerato per `value` comprende stringhe e valori di tipo errato. Per `hash` si considerano hash testuali provenienti dal modello utente, stringhe malformate e valore assente. Oggetti arbitrari come hash sono fuori dal contratto interno del metodo e non vengono dichiarati coperti.

| Parametro | Classe individuata | Rappresentanti e test |
| --- | --- | --- |
| value | P1: stringa entro 72 byte UTF-8 | Password corrispondente MP01, diversa MP02; limiti MP07 e MP09 |
| value | P2: stringa oltre 72 byte | 73 byte ASCII MP08, 74 byte UTF-8 MP10 |
| value | P3: valore non testuale | null, undefined, numero, oggetto, array in MP06; MP11 verifica anche il confronto fittizio |
| hash | H1: hash BCrypt 2b valido | Hash reale in MP01 e nei casi sui limiti |
| hash | H2: hash BCrypt 2a storico valido | MP03 |
| hash | H3: hash assente | null, undefined e stringa vuota in MP04 |
| hash | H4: stringa non BCrypt | MP05 |

Nei casi negativi R-WECT viene variato un solo parametro non valido alla volta: P2/P3 con hash valido, oppure H3/H4 con password valida. Non viene generato il prodotto cartesiano di tutti gli input errati. MP02 e un confronto negativo fra input formalmente validi, non una validazione fallita. Alcuni test includono piu rappresentanti della stessa classe.

| Test | Input significativo | Esito atteso |
| --- | --- | --- |
| MP01 | Password corretta e hash 2b | true |
| MP02 | Password diversa, hash valido | false |
| MP03 | Password corretta e hash 2a | true |
| MP04 | Password valida, hash assente | false anche se la password coincide con quella dell'hash fittizio |
| MP05 | Password valida, hash malformato | false |
| MP06 | Password non testuale, hash valido | false |
| MP07 | ASCII esattamente 72 byte, hash corrispondente | true |
| MP08 | ASCII 73 byte, hash dei primi 72 byte | false, nessuna autenticazione per troncamento |
| MP09 | 36 caratteri da due byte, hash corrispondente | true |
| MP10 | 37 caratteri da due byte, hash dei primi 36 | false |
| MP11 | Password non testuale, hash valido della stringa sostitutiva | false, il confronto fittizio non autorizza |

### 3.4 notify(issue, actor, message, recipientIds, transaction)

**Sorgente:** `backend/src/services/notifications.js`. **Test:** `backend/test/unit/notify.test.js`.

**Strategia white-box:** verificare il controllo di transazione, la normalizzazione dell'elenco, la deduplicazione, il ciclo con zero/uno/piu destinatari e la decisione `user && (ADMIN || membership)`. Si controllano contenuto e transazione delle richieste di salvataggio. I salvataggi sono simulati: il rollback reale appartiene ai test di integrazione, non viene dedotto dagli stub.

| Test | Condizione | Esito atteso |
| --- | --- | --- |
| NT01 | Transazione assente | Errore prima delle letture |
| NT02 | Elenco vuoto | Nessuna lettura o scrittura |
| NT03 | Valori assenti e ID dell'attore, numerico o testuale | Nessuna notifica |
| NT04 | ID ripetuti, anche numero/stringa | Una sola lettura e una sola notifica |
| NT05 | USER membro | Salvataggio con issue, destinatario, messaggio e transazione attesi |
| NT06 | ADMIN esistente | Salvataggio senza controllo membership |
| NT07 | Utente inesistente | Nessuna membership letta e nessuna notifica |
| NT08 | USER non membro | Nessuna notifica |
| NT09 | Elenco misto | Solo i destinatari autorizzati ricevono una notifica |
| NT10 | Lettura destinatario fallita | Errore propagato, nessun salvataggio |
| NT11 | Salvataggio fallito | Errore propagato, elaborazione interrotta |

### Copertura strutturale e limiti dell'interpretazione

Il criterio strutturale adottato e esercitare gli esiti delle decisioni dei metodi selezionati, compresi i cortocircuiti logici rilevanti. c8 raccoglie la copertura V8 ed esporta report LCOV e JSON. I quattro metodi risultano interamente eseguiti nelle righe e nei contatori di ramo rilevati dal report della sola suite unitaria.

| Metodo selezionato | Righe coperte nell'intervallo del metodo | Contatori di ramo c8 coperti nell'intervallo |
| --- | ---: | ---: |
| requireProject | 8/8 | 7/7 |
| requireAssignee | 9/9 | 7/7 |
| matchesPassword | 5/5 | 7/7 |
| notify | 12/12 | 10/10 |

Gli intervalli sono quelli delle funzioni in `fnMap`; i contatori sono letti da `statementMap`/`s` e `branchMap`/`b` del JSON c8. V8/c8 associa qui le istruzioni a intervalli di riga: questi numeri non sono una numerazione dei nodi di un grafo di flusso. Non vengono dichiarati Node Coverage o Test Effectiveness Ratio. Il 100% dei contatori di ramo non significa copertura di tutti i percorsi, di tutte le condizioni combinate o assenza di difetti.

La percentuale dell'intero file puo essere inferiore a quella del metodo: `access.js`, `auth.js` e `notifications.js` contengono anche altre funzioni. Il report unitario include inoltre tutti i file applicativi, anche quelli volutamente non coinvolti nei quattro metodi; non va confrontato direttamente con la copertura dell'intera suite.

## 4. Risultati della verifica

Verifica del 25 ottobre 2026, Node.js e PostgreSQL 17 temporaneo:

- 95/95 test backend QUnit superati nel comando completo: 38 unitari e 57 di integrazione, senza test saltati o `todo`.
- 55/55 test frontend Vitest superati; lint e build completati.
- `frontend/test/AuthSession.test.jsx` verifica login/logout, invio del token, ripristino della sessione e pulizia dopo HTTP 401, conservando il client Axios e gli interceptor dell'applicazione.
- I casi di integrazione verificano autenticazione, progetti e membri, issue, assegnazioni, commenti, immagini e notifiche.
- Verificata la concorrenza con vere richieste HTTP e il lock PostgreSQL: un successo e un conflitto, senza sovrascritture.
- Verificate notifiche di risoluzione al solo reporter, deduplicazione e rollback delle operazioni applicative.
- Copertura complessiva backend del comando completo: 94,18% righe/istruzioni, 90,36% rami, 98,55% funzioni.

Le percentuali sono una fotografia dell'esecuzione, non un obiettivo automaticamente garantito per modifiche future. Su Windows il percorso `server.js`, verificato con veri processi riavviati, non risulta raccolto nel report c8 dei processi terminati: il successo del test di persistenza e la copertura strumentale sono evidenze distinte.

## 5. Comandi riproducibili

Dalla radice del repository, installazione delle dipendenze backend:

```powershell
npm.cmd --prefix backend ci
```

Solo test unitari, senza Docker e senza PostgreSQL:

```powershell
npm.cmd --prefix backend run test:unit
```

Tutta la suite con Docker Desktop aperto e database temporaneo automatico:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\test-docker.ps1
```

Per usare un database PostgreSQL dedicato ai test, dalla root:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://utente:password@127.0.0.1:5432/bugboard_tests'
npm.cmd --prefix backend test
```

Per eseguire solo l'integrazione, con la stessa variabile impostata:

```powershell
npm.cmd --prefix backend run test:integration
```

Report: `backend/coverage/` per il comando completo, `backend/coverage-unit/` per i soli unitari, `backend/coverage-integration/` per la sola integrazione. Ogni cartella contiene `lcov.info`, `coverage-final.json` e il report HTML in `lcov-report/index.html`. Le cartelle generate non vengono versionate. GitHub Actions usa il comando completo e SonarQube legge ancora `backend/coverage/lcov.info`.

## 6. Valutazione di usabilita

La valutazione richiesta dalla traccia comprende sia una ispezione con checklist sia prove osservate con utenti reali o potenziali e questionario. Non e sostituita dai test QUnit o dai test React. I risultati delle prove con utenti e dei questionari restano da raccogliere e integrare nella documentazione unica; non sono stati inventati risultati.

## Riferimenti agli strumenti

- [QUnit: esecuzione da Node.js](https://qunitjs.com/cli/).
- [QUnit: suite e preparazione/pulizia](https://qunitjs.com/api/QUnit/module/).
- [QUnit: asserzioni](https://qunitjs.com/api/assert/).
- [c8: copertura V8](https://github.com/bcoe/c8).
