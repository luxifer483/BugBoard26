# Docker Setup

Questa cartella contiene PostgreSQL e il backend Node.js/Express per lo sviluppo locale.

## Avvio

Da root progetto:

```powershell
docker compose -f .\infra\docker\docker-compose.yml build backend
docker compose -f .\infra\docker\docker-compose.yml run --rm backend npm run db:init
docker compose -f .\infra\docker\docker-compose.yml up -d
```

## Arresto

```powershell
docker compose -f .\infra\docker\docker-compose.yml down
```

## Verifica

```powershell
docker ps
```

## Note

- Eseguire `db:init` anche per aggiornare un database esistente: applica gli script SQL versionati in transazione,
  rende facoltativa la priorita', converte OPEN in TODO e aggiunge il tipo delle notifiche senza eliminare dati.
- Prima di un aggiornamento effettuare un backup; gli script sono ripetibili e il server non modifica automaticamente lo schema.
- Per usare il backend con Node locale, avviare solo il DB con `up -d postgres`.
- Il DB e' esposto sulla porta host 5433, mantenendo 5432 all'interno della rete Docker.
- Il backend in container espone la porta host 8081 (8080 interna) e usa NODE_ENV=development; non avviare contemporaneamente quello Node locale.
- Istruzioni complete e account iniziale: `backend/README.md`.

- Le variabili del database sono in `.env`.
- Gli script SQL iniziali possono essere aggiunti in `postgres/init`.
- Il volume `postgres_data` mantiene i dati anche dopo lo stop del container.
