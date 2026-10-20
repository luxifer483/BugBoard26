# BugBoard26

Applicazione React + Node.js/Express + Sequelize + PostgreSQL.

La prima milestone comprende autenticazione JWT, utenti USER/ADMIN, progetti e appartenenze persistenti.
La seconda aggiunge issue, assegnazioni, commenti, notifiche personali e statistiche.
Il frontend usa le API reali di default per entrambe le milestone.

- [Avvio e test backend](backend/README.md)
- [Contratto API e regole di accesso](docs/api/milestone-1.md)
- [Issue, commenti e notifiche: contratto e verifiche](docs/api/milestone-2.md)
- [Modello backend implementato](docs/diagrammi/backend-model-as-is.puml)
- [Diagramma frontend](docs/diagrammi/frontend-as-is.puml)

Con Node.js 22+ e Docker Desktop aperto, dalla root (prima configurazione):

```powershell
docker compose -f .\infra\docker\docker-compose.yml up -d postgres
cd backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run db:init
npm.cmd run dev
```

In un secondo terminale:

```powershell
npm.cmd --prefix frontend run dev
```

Account locale di sviluppo: `admin@bugboard26.dev` / `ChangeMe123!`.
Conservare un eventuale `backend/.env` gia' configurato. Il server non modifica automaticamente lo schema:
`db:init` crea le tabelle mancanti e applica gli aggiornamenti SQL versionati, inclusa la conversione OPEN -> TODO.
Eseguirlo anche aggiornando un database esistente; dati PostgreSQL e account vengono conservati.
Per i test: `powershell -ExecutionPolicy Bypass -File .\backend\test-docker.ps1` dalla root.
Struttura, migrazione da Spring e comandi Docker completi sono nel [README backend](backend/README.md).
Per la demo con dati simulati, impostare `VITE_USE_MOCK_API=true` nel frontend e riavviare Vite.
