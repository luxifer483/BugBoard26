# Docker Setup

Per ora questa cartella contiene solo il database PostgreSQL del progetto.

## Avvio

Da root progetto:

```powershell
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

- Le variabili del database sono in `.env`.
- Gli script SQL iniziali possono essere aggiunti in `postgres/init`.
- Il volume `postgres_data` mantiene i dati anche dopo lo stop del container.
