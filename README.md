# BugBoard26

Applicazione React + Node.js/Express + Sequelize + PostgreSQL.

La prima milestone comprende autenticazione JWT, utenti USER/ADMIN, progetti e appartenenze persistenti.
La seconda aggiunge issue, assegnazioni, commenti, notifiche personali e statistiche.
Il frontend usa le API reali di default per entrambe le milestone.

- [Avvio e test backend](backend/README.md)
- [Test plan, metodi selezionati e strategie di testing](docs/testing.md)
- [Contratto API e regole di accesso](docs/api/milestone-1.md)
- [Issue, commenti e notifiche: contratto e verifiche](docs/api/milestone-2.md)
- [Modello backend implementato](docs/diagrammi/backend-model-as-is.puml)
- [Diagramma frontend](docs/diagrammi/frontend-as-is.puml)

## Avvio completo con Docker

Con Docker Desktop avviato, dalla root del progetto:

```powershell
docker compose up -d --build
```

Il comando compila e avvia frontend, backend e PostgreSQL. Non occorre installare Node.js
o eseguire npm sul computer host. Aprire http://localhost:5173 dopo l'avvio dei servizi.
La prima build richiede il download delle immagini e delle dipendenze.

```powershell
docker compose ps
docker compose logs -f backend
docker compose down
```

`down` arresta i servizi e conserva i dati. Non aggiungere `-v` se si vuole conservare il database.
Il progetto mantiene il nome Compose `docker` e il volume `docker_postgres_data` gia utilizzato.
Le credenziali PostgreSQL sono lette da `infra/docker/.env`. Il backend crea le tabelle mancanti
all'avvio; non occorre un comando separato di inizializzazione.
Frontend: http://localhost:5173; API dirette: http://localhost:8081/api.
Non avviare contemporaneamente i processi locali sulle stesse porte.
Il comando richiede Docker Compose 2.20+ per il file `compose.yaml` nella root.
Ulteriori dettagli e configurazione: [Docker](infra/docker/README.md).

## Avvio locale per lo sviluppo

Con Node.js 22+ e Docker Desktop aperto, dalla root (prima configurazione):

```powershell
docker compose -f .\infra\docker\docker-compose.yml up -d postgres
cd backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run dev
```

In un secondo terminale:

```powershell
npm.cmd --prefix frontend run dev
```

Account locale di sviluppo: `admin@bugboard26.dev` / `ChangeMe123!`.
Conservare un eventuale `backend/.env` gia' configurato. All'avvio Sequelize crea le tabelle mancanti
dai modelli in `backend/src/models/index.js`, senza cancellare o alterare le tabelle esistenti.
Per i test: `powershell -ExecutionPolicy Bypass -File .\backend\test-docker.ps1` dalla root.
Struttura e comandi Docker completi sono nel [README backend](backend/README.md).
