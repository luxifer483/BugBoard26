# Avvio Docker completo

Con Docker Desktop avviato, dalla root di BugBoard26:

```powershell
docker compose up -d --build
```

Il file root `compose.yaml` include questa configurazione, carica automaticamente il `.env`
di questa cartella e mantiene il nome del progetto `docker`. Serve Docker Compose 2.20+.
Rimane valido anche il comando completo:

```powershell
docker compose -f .\infra\docker\docker-compose.yml up -d --build
```

## Servizi

- Frontend React compilato con Vite e servito da Nginx: http://localhost:5173.
- Backend Express: http://localhost:8081/api.
- PostgreSQL: porta host configurata con POSTGRES_PORT nel `.env`, normalmente 5433.

Il frontend usa `/api` sul proprio indirizzo; Nginx inoltra le richieste al backend nella rete Docker.
I link diretti e il refresh delle rotte React sono supportati. Le immagini delle issue sono inoltrate
con limite HTTP di 6 MB, lasciando al backend il controllo effettivo del limite file di 5 MB.
I `.env` locali del frontend non entrano nell'immagine Docker.

PostgreSQL deve risultare healthy prima dell'avvio del backend. Il frontend parte dopo il controllo
HTTP del backend. All'avvio il backend usa `sequelize.sync()` per creare le tabelle mancanti,
senza cancellare o alterare le tabelle gia presenti, e prepara l'admin iniziale di sviluppo se assente.
Non serve eseguire `npm ci`, `db:init` o `npm run dev` sul computer host.

## Stato, log e arresto

```powershell
docker compose ps
docker compose logs -f
docker compose down
```

`down` mantiene il volume `docker_postgres_data`. Non usare `down -v` per arrestare normalmente
l'applicazione: eliminerebbe i dati. Il nome Compose `docker` preserva il volume storico;
scegliere un altro nome progetto con `-p` crea normalmente un database distinto.

Per aggiornare il codice, ripetere `docker compose up -d --build`.
Non avviare contemporaneamente backend o Vite locali sulle porte 8081 e 5173.

## Configurazione

Le variabili PostgreSQL sono nel `.env` di questa cartella. Mantenerle coerenti con il database esistente:
modificare una password in questo file non modifica la password gia salvata nel volume PostgreSQL.
La variabile facoltativa FRONTEND_PORT cambia la porta del frontend (default 5173); gli origin CORS
del backend vengono adattati alla stessa porta. In locale sono accettati localhost e 127.0.0.1.

L'account iniziale di sviluppo e `admin@bugboard26.dev` / `ChangeMe123!`, salvo override ADMIN_EMAIL
e ADMIN_PASSWORD. Gli account gia presenti non vengono sovrascritti.

Per usare Node e Vite fuori dai container avviare solo il database:

```powershell
docker compose up -d postgres
```

I comandi di sviluppo restano descritti nel [README backend](../../backend/README.md).
