# Docker Setup

Questa cartella contiene PostgreSQL e il backend Spring Boot per lo sviluppo locale.

## Avvio

Da root progetto:

```powershell
docker compose -f .\infra\docker\docker-compose.yml up -d --build
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

- Per usare il backend da Maven, avviare solo il DB con `up -d postgres`.
- Il DB e' esposto sulla porta host 5433, mantenendo 5432 all'interno della rete Docker.
- Il backend in container espone la porta host 8081 (8080 interna) e usa il profilo dev; non avviare contemporaneamente quello da Maven.
- Istruzioni complete e account iniziale: `backend/README.md`.

- Le variabili del database sono in `.env`.
- Gli script SQL iniziali possono essere aggiunti in `postgres/init`.
- Il volume `postgres_data` mantiene i dati anche dopo lo stop del container.
