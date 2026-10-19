# BugBoard26 backend

Node.js (22 o successivo), JavaScript con import/export, Express 5, Sequelize 6 e PostgreSQL.
La struttura segue il riferimento richiesto: richiesta -> rotta -> middleware -> controller -> servizi/modelli -> risposta.

## Avvio locale (PowerShell)

Dalla root, con Docker Desktop aperto:

```powershell
docker compose -f .\infra\docker\docker-compose.yml up -d postgres
cd backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run db:init
npm.cmd run dev
```

Copiare `.env.example` solo alla prima configurazione: non sovrascrivere un `.env` gia' personalizzato.
Controllare DB_PORT e credenziali rispetto a `infra/docker/.env`; la porta prevista e' 5433.
`db:init` e' un comando esplicito che crea solo tabelle/indici mancanti, anche su un DB della milestone 1.
Se il DB ha gia' lo schema completo, basta avviare il server. L'avvio non esegue sync, alter o force.
Per un avvio senza riavvio automatico: `npm.cmd start`.
API: `http://localhost:8081/api`. Il frontend continua a usare gli stessi endpoint e JSON.

In un altro terminale dalla root:

```powershell
npm.cmd --prefix frontend run dev
```

Account iniziale di sviluppo: `admin@bugboard26.dev` / `ChangeMe123!`.
Il bootstrap e' attivo solo con NODE_ENV=development (predefinito locale) e non modifica account gia' presenti.
Per un database nuovo con NODE_ENV=production occorre predisporre l'admin prima del cambio di ambiente.

## Struttura

```text
backend/
  package.json, package-lock.json, .env.example
  Dockerfile, run-dev.ps1, test-docker.ps1
  scripts/init-db.js           comando esplicito di inizializzazione
  sql/001-initial.sql          schema identico alle tabelle usate da Spring
  src/
    app.js                    prepara Express, senza metterlo in ascolto
    server.js                 controlla PostgreSQL e avvia HTTP
    routes.js                 elenco centrale degli endpoint e relativi middleware
    config/database.js        configurazione Sequelize
    models/index.js           sei modelli e relazioni, senza scritture automatiche
    middleware/
      auth.js                 JWT e permesso ADMIN
      errors.js               risposte JSON uniformi per gli errori
    controllers/
      auth.controller.js
      users.controller.js
      projects.controller.js
      members.controller.js
      issues.controller.js
      comments.controller.js
      notifications.controller.js
    services/
      auth.js                 BCrypt, creazione e verifica JWT
      access.js               controllo appartenenza al progetto
      issues.js               modifiche issue e transazioni
      notifications.js        creazione notifiche, nella transazione dell'operazione
      responses.js            preparazione dei JSON attesi dal frontend
      validation.js           controlli dei dati ricevuti
      bootstrap.js            admin iniziale di sviluppo
      schema.js               inizializzazione richiesta da db:init
  test/api.test.js            test HTTP su PostgreSQL isolato
```

`models/index.js` e' abbastanza piccolo per tenere insieme le sei tabelle.
I modelli descrivono i dati; `create`, `update` e `destroy` eseguono le scritture.
Non sono stati introdotti repository o classi DTO. I controller semplici usano direttamente i modelli;
le operazioni composte e i controlli condivisi stanno nei servizi.

## Dove ritrovare il codice Spring

| Prima | Ora |
| --- | --- |
| SecurityConfig e CurrentUser | middleware/auth.js, services/auth.js, app.js (CORS) |
| AuthController / AuthService | controllers/auth.controller.js, services/auth.js |
| UserController / UserService | controllers/users.controller.js |
| ProjectController / ProjectService | controllers/projects.controller.js |
| ProjectMemberController / Service | controllers/members.controller.js |
| ProjectAccess / IssueAccess | services/access.js |
| IssueController / IssueService | controllers/issues.controller.js, services/issues.js |
| CommentController / CommentService | controllers/comments.controller.js |
| NotificationController / Service | controllers/notifications.controller.js, services/notifications.js |
| Entita' JPA e repository | models/index.js e query Sequelize nei controller/servizi |
| Request DTO e Bean Validation | services/validation.js e campi selezionati dai controller |
| Response DTO | funzioni di services/responses.js |
| GlobalExceptionHandler | middleware/errors.js |
| DevBootstrap | services/bootstrap.js |
| application*.yml | .env e config/database.js |
| @Transactional | sequelize.transaction(async transaction => ...) |

## Esempio: POST /api/issues

1. app.js legge il JSON e routes.js individua la rotta.
2. authenticate verifica il Bearer JWT e rilegge l'utente dal DB, mettendolo in req.user.
3. issues.controller.js controlla i campi ammessi (autore, stato e date non provengono dal client).
4. services/issues.js apre una transazione, verifica progetto e assegnatario e salva l'issue con Sequelize.
5. services/notifications.js salva l'eventuale notifica nella stessa transazione.
6. Se tutto riesce viene confermata la transazione; altrimenti tutte le scritture vengono annullate.
7. Il controller restituisce 201 con lo stesso IssueResponse JSON di prima.

## Autenticazione e dati esistenti

Il meccanismo resta stateless: nessuna express-session e nessun cookie di sessione.
JWT HS256 con subject uguale all'ID utente, issuer bugboard26, audience bugboard26-frontend e scadenza di un'ora.
La chiave usa gli stessi byte UTF-8 del vecchio JWT_SECRET. I token Spring ancora validi restano utilizzabili
se JWT_SECRET, issuer e audience restano uguali. Ruolo e account vengono riletti dal DB a ogni richiesta.
Gli hash BCrypt gia' presenti, incluso il formato $2a$, vengono verificati senza reset delle password.
Logout e ripristino sessione restano gestiti dal frontend come prima; non e' stato aggiunto refresh o revoca token.

I modelli specificano gli stessi nomi delle tabelle e colonne di Spring, con timestamp gestiti esplicitamente.
Lo schema non cambia durante questa migrazione: `sql/001-initial.sql` conserva il vecchio SQL idempotente.
Per future modifiche aggiungere script SQL versionati ed eseguirli esplicitamente dopo una copia di sicurezza;
non usare `sequelize.sync({ force: true })` o `sync({ alter: true })` sul database esistente.

Per scelta concordata restano OPEN/IN_PROGRESS/CLOSED, priorita' obbligatoria e accesso per membership.
Anche i permessi sul cambio stato e i destinatari delle notifiche restano quelli precedenti.
Le correzioni alla traccia e l'upload immagini sono attivita' separate. CORS ammette anche PATCH, necessario
agli endpoint gia' presenti per stato, assegnazione e lettura notifiche.

## Test

Con Node.js, dipendenze installate e Docker Desktop aperto, dalla root:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\test-docker.ps1
```

Lo script crea un PostgreSQL temporaneo su porta casuale e lo rimuove alla fine, incluso il volume temporaneo.
La suite Node usa richieste HTTP reali, uno schema casuale e non punta al database di sviluppo.
In alternativa, dalla cartella backend, predisporre un PostgreSQL di test:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://utente:password@127.0.0.1:5432/bugboard_tests'
npm.cmd test
```

Senza TEST_DATABASE_URL i test si fermano: non ripiegano sul DB del file .env.
Coprono autenticazione, permessi, CRUD implementato, contratti JSON, CORS PATCH, transazioni/rollback,
concorrenza, compatibilita' BCrypt/JWT, inizializzazione non distruttiva, bootstrap admin e riavvio del server.
Verifica della migrazione: 33 test passati; lint/build frontend passati; immagine Docker costruita e avviata.
Provati inoltre il vecchio JAR Spring e Express sullo stesso DB temporaneo: token e password compatibili
in entrambe le direzioni e lettura coerente di dati, statistiche, commenti e notifiche.

## Docker completo

Dalla root, solo la prima volta o quando mancano tabelle:

```powershell
docker compose -f .\infra\docker\docker-compose.yml build backend
docker compose -f .\infra\docker\docker-compose.yml run --rm backend npm run db:init
docker compose -f .\infra\docker\docker-compose.yml up -d
```

Con schema gia' completo basta `docker compose -f .\infra\docker\docker-compose.yml up -d --build`.
Il servizio backend espone 8081 sull'host; PostgreSQL conserva il volume `postgres_data` esistente.
Non usare `down -v` per conservare i dati. Non avviare insieme backend locale e container sulla stessa porta.

## Configurazione essenziale

| Variabile | Scopo |
| --- | --- |
| NODE_ENV | development locale, production per richiedere JWT_SECRET esplicito |
| SERVER_PORT | Porta HTTP, predefinita 8081; 8080 nel container |
| DB_HOST, DB_PORT, DB_NAME | PostgreSQL locale o servizio postgres nel container |
| DB_USERNAME, DB_PASSWORD | Credenziali PostgreSQL |
| DB_URL | URL alternativo; accetta anche il vecchio prefisso jdbc:postgresql: |
| JWT_SECRET | Stessa chiave di prima per mantenere i token; almeno 32 byte UTF-8 |
| JWT_ISSUER, JWT_AUDIENCE, JWT_TTL_SECONDS | Impostazioni JWT, valori predefiniti compatibili con Spring |
| CORS_ALLOWED_ORIGINS | Origini frontend ammesse, separate da virgola |
| ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME | Primo admin in sviluppo |

L'override uuid 11.1.1 in package.json aggiorna una dipendenza indiretta di Sequelize mantenendo le API
v1/v4 usate dall'ORM. Il lockfile rende riproducibili le installazioni con npm ci.
