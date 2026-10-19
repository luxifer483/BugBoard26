# BugBoard26 frontend

React 19, JavaScript/JSX, Vite, React Router e Axios.

## Avvio

Dalla root, con il backend disponibile su `http://localhost:8081/api`:

```powershell
npm.cmd --prefix frontend install
npm.cmd --prefix frontend run dev
```

Aprire l'indirizzo stampato da Vite, normalmente `http://localhost:5173`.
Per avviare anche backend e PostgreSQL con Docker Desktop:

```powershell
docker compose -f .\infra\docker\docker-compose.yml build backend
docker compose -f .\infra\docker\docker-compose.yml run --rm backend npm run db:init
docker compose -f .\infra\docker\docker-compose.yml up -d
```

L'inizializzazione e' esplicita e crea soltanto le tabelle mancanti. Con schema gia' completo
basta `up -d --build`. Il backend ora usa Node.js/Express e Sequelize; gli endpoint restano gli stessi.

Account iniziale di sviluppo: `admin@bugboard26.dev` / `ChangeMe123!`.

## Configurazione

Le API reali sono attive di default. Per personalizzarle creare `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8081/api
VITE_USE_MOCK_API=false
```

Per la demo senza backend impostare `VITE_USE_MOCK_API=true` e riavviare Vite.
I dati mock modificati restano in memoria fino al ricaricamento della pagina.

## Funzionalita'

Login e ripristino sessione, progetti, gestione utenti/membership per ADMIN,
creazione e assegnazione issue, filtri e statistiche, avanzamento OPEN -> IN_PROGRESS -> CLOSED,
commenti e notifiche personali con stato letto. Le notifiche vengono aggiornate ogni 30 secondi,
all'apertura del pannello e dopo le operazioni. Upload e modifica del profilo non sono implementati.

`pages/` contiene le schermate, `components/` gli elementi riutilizzabili,
`layouts/` la struttura comune, `api/` gli adapter HTTP/mock, `context/` e `hooks/`
l'autenticazione condivisa, `security/` sessione e protezione delle rotte.

Contratti: [milestone 1](../docs/api/milestone-1.md), [milestone 2](../docs/api/milestone-2.md).

## Verifiche

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```
