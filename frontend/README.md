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
docker compose -f .\infra\docker\docker-compose.yml up -d
```

Il backend crea automaticamente le tabelle mancanti dai modelli Sequelize durante l'avvio.
Gli endpoint e i collegamenti del frontend restano gli stessi.

Account iniziale di sviluppo: `admin@bugboard26.dev` / `ChangeMe123!`.

## Configurazione

Il frontend richiede il backend attivo. Per configurarne l'indirizzo creare `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8081/api
```


## Funzionalita'

La home mostra la panoramica dei progetti. La barra orizzontale contiene Projects, le azioni
Users/Create user/Create project per ADMIN e le notifiche; il profilo e raggiungibile dal menu dell'avatar.
`/users` gestisce gli account globali: crearne uno non lo aggiunge a un progetto.
`/projects/:projectId/members` permette di scegliere account esistenti da aggiungere al team.
Il ruolo USER/ADMIN e globale e la rimozione da un progetto non cancella l'account.

Login e ripristino sessione, progetti, creazione e assegnazione issue, filtri e statistiche,
avanzamento TODO -> IN_PROGRESS -> CLOSED,
commenti e notifiche personali con stato letto. Le notifiche vengono aggiornate ogni 30 secondi,
all'apertura del pannello e dopo le operazioni. Le issue ammettono una immagine facoltativa.
Il profilo mostra i dati dell'account autenticato; la modifica del profilo non e implementata.

`pages/` contiene le schermate, `components/` gli elementi riutilizzabili,
`layouts/` la struttura comune, `api/` le chiamate HTTP al backend, `context/` e `hooks/`
l'autenticazione condivisa, `security/` sessione e protezione delle rotte.
`api/client.js` aggiunge il token alle richieste leggendo la sessione salvata e gestisce gli errori 401.

Contratti: [milestone 1](../docs/api/milestone-1.md), [milestone 2](../docs/api/milestone-2.md).

## Verifiche

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
```

## Copertura test e SonarQube

Eseguire `npm run test:coverage` dalla cartella frontend. Vitest misura tutti i file
JavaScript/JSX in `src`, anche quelli non importati dai test, e produce
`coverage/lcov.info` oltre al riepilogo. Il workflow SonarQube esegue le suite
backend e frontend e importa entrambi i report LCOV. I test frontend sono
classificati come test, non come codice applicativo. Nessun file applicativo viene
escluso per aumentare artificialmente la copertura.
