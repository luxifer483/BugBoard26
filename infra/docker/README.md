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

- `db:init` e' richiesto solo per un database nuovo o con tabelle mancanti: non altera tabelle o dati esistenti.
- Con schema completo basta `up -d --build`; il server non esegue sincronizzazioni automatiche dello schema.
- Per usare il backend con Node locale, avviare solo il DB con `up -d postgres`.
- Il DB e' esposto sulla porta host 5433, mantenendo 5432 all'interno della rete Docker.
- Il backend in container espone la porta host 8081 (8080 interna) e usa NODE_ENV=development; non avviare contemporaneamente quello Node locale.
- Istruzioni complete e account iniziale: `backend/README.md`.

- Le variabili del database sono in `.env`.
- Gli script SQL iniziali possono essere aggiunti in `postgres/init`.
- Il volume `postgres_data` mantiene i dati anche dopo lo stop del container.
