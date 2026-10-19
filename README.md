# BugBoard26

Applicazione React + Spring Boot + PostgreSQL.

La prima milestone comprende autenticazione JWT, utenti USER/ADMIN, progetti e appartenenze persistenti.
La seconda aggiunge issue, assegnazioni, commenti, notifiche personali e statistiche.
Il frontend usa le API reali di default per entrambe le milestone.

- [Avvio e test backend](backend/README.md)
- [Contratto API e regole di accesso](docs/api/milestone-1.md)
- [Issue, commenti e notifiche: contratto e verifiche](docs/api/milestone-2.md)
- [Modello backend implementato](docs/diagrammi/backend-model-as-is.puml)
- [Diagramma frontend](docs/diagrammi/frontend-as-is.puml)

Con Docker Desktop aperto, dalla root:

```powershell
docker compose -f .\infra\docker\docker-compose.yml up -d postgres
.\backend\run-dev.ps1
```

In un secondo terminale:

```powershell
npm --prefix frontend run dev
```

Account locale di sviluppo: `admin@bugboard26.dev` / `ChangeMe123!`.
Per la demo con dati simulati, impostare `VITE_USE_MOCK_API=true` nel frontend e riavviare Vite.
