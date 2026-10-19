# Contratto API - milestone 2

Il backend e' stato migrato a Node.js/Express e Sequelize mantenendo endpoint, JSON e regole qui descritte.
La struttura e i comandi correnti sono in [backend/README.md](../../backend/README.md).

Questa milestone aggiunge issue, commenti, notifiche personali e statistiche reali ai progetti.
Restano valide autenticazione JWT, errori e regole di accesso della [milestone 1](milestone-1.md).
Base URL locale: `http://localhost:8081/api`. Timestamp ISO 8601 UTC; liste non paginate.

## Regole

- ADMIN ha accesso globale; USER puo' leggere e modificare solo le issue dei progetti di cui e' membro.
- Tutti i membri possono creare issue, assegnarle, avanzarne lo stato e commentarle.
- Reporter e autore del commento sono ricavati dall'identita' autenticata, mai dal JSON del client.
- L'assegnatario deve essere un membro del progetto, anche quando e' ADMIN. `assigneeId: null` significa nessuna assegnazione.
- La rimozione di un membro revoca subito l'accesso a issue e commenti e nasconde le relative notifiche.
  L'attribuzione storica di reporter, autore e assegnatario rimane; il frontend segnala gli assegnatari non piu' membri.
- Stato iniziale OPEN. Transizioni consentite: OPEN -> IN_PROGRESS -> CLOSED.
  Ripetere lo stato corrente e' idempotente; salti, ritorni indietro e riapertura restituiscono 409.
  E' possibile commentare o cambiare assegnatario anche dopo la chiusura.
- Le scritture e le notifiche sono nella stessa transazione. Un lock sulla issue serializza commenti,
  assegnazioni e cambi di stato concorrenti; richieste identiche di stato/assegnazione non duplicano gli eventi.
- Le notifiche di assegnazione vanno al nuovo assegnatario; quelle di commento e stato a reporter e assegnatario.
  L'attore e' escluso, i destinatari sono deduplicati e devono avere ancora accesso al progetto.
- Le notifiche sono personali anche per gli amministratori: non e' possibile leggere o modificare quelle altrui.
  Se una membership viene ripristinata, le precedenti notifiche tornano visibili.

## Endpoint

Tutti richiedono `Authorization: Bearer <token>`.

| Metodo | Percorso | Risposta |
| --- | --- | --- |
| GET | /projects/{projectId}/issues | 200 ListResponse di IssueResponse; richiede accesso al progetto |
| GET | /issues | 200 ListResponse delle sole issue accessibili; globale per ADMIN |
| POST | /issues | 201 IssueResponse |
| GET | /issues/{id} | 200 IssueResponse |
| PATCH | /issues/{id}/status | 200 IssueResponse |
| PATCH | /issues/{id}/assignee | 200 IssueResponse |
| GET | /issues/{id}/comments | 200 ListResponse di CommentResponse, dal piu' vecchio |
| POST | /issues/{id}/comments | 201 CommentResponse |
| GET | /notifications | 200 NotificationListResponse, dalla piu' recente |
| PATCH | /notifications/{id}/read | 200 NotificationResponse; idempotente |

## DTO

CreateIssueRequest:

```json
{
  "projectId": 1,
  "title": "Errore durante il login",
  "description": "Passaggi per riprodurre il problema...",
  "type": "BUG",
  "priority": "HIGH",
  "assigneeId": 2
}
```

`projectId` positivo e obbligatorio; `title` non vuoto, massimo 200 caratteri; `description`
non vuota, massimo 10000 caratteri. Tipo e priorita' obbligatori; assegnatario facoltativo.

| Campo | Valori |
| --- | --- |
| type | BUG, FEATURE, DOCUMENTATION, QUESTION |
| priority | LOW, MEDIUM, HIGH, CRITICAL |
| status | OPEN, IN_PROGRESS, CLOSED |

I vecchi nomi TODO/DONE non sono accettati. Tipo e priorita' seguono i valori gia' presenti nel frontend.

IssueResponse:

```json
{
  "id": 1, "code": "BUG-26-1", "title": "Errore durante il login",
  "description": "Passaggi per riprodurre il problema...",
  "type": "BUG", "priority": "HIGH", "status": "OPEN",
  "project": { "id": 1, "name": "BugBoard26" },
  "reporter": { "id": 1, "fullName": "Admin", "email": "admin@example.test", "role": "ADMIN", "avatarUrl": "" },
  "assignee": { "id": 2, "fullName": "Mario", "email": "mario@example.test", "role": "USER", "avatarUrl": "" },
  "createdAt": "2026-10-18T10:00:00Z", "updatedAt": "2026-10-18T10:00:00Z"
}
```

Il codice usa l'ID globale generato dal database: univoco anche con creazioni concorrenti;
non e' una numerazione progressiva per progetto. `assignee` puo' essere null.

UpdateIssueStatusRequest: `{ "status": "IN_PROGRESS" }`.

AssignIssueRequest: `{ "assigneeId": 2 }`; `{ "assigneeId": null }` rimuove l'assegnazione.
Un oggetto vuoto equivale a null. ID negativi e zero sono invalidi.

CreateCommentRequest: `{ "content": "Ho riprodotto il problema." }`.
Contenuto non vuoto, massimo 5000 caratteri; testo salvato senza spazi iniziali/finali.

CommentResponse:

```json
{
  "id": 1, "issueId": 1, "content": "Ho riprodotto il problema.",
  "author": { "id": 2, "fullName": "Mario", "email": "mario@example.test", "role": "USER", "avatarUrl": "" },
  "createdAt": "2026-10-18T10:05:00Z"
}
```

Le liste issue e commenti hanno forma `{ "items": [...], "totalCount": 1 }`.

NotificationListResponse:

```json
{
  "items": [{ "id": 1, "issueId": 1, "message": "Issue BUG-26-1 has been assigned to you", "read": false, "createdAt": "2026-10-18T10:00:00Z" }],
  "totalCount": 1, "unreadCount": 1
}
```

La marcatura letta restituisce il singolo elemento con `read: true`. Per ID altrui o inesistenti:
404; per una propria notifica di un progetto revocato: 403. Il conteggio include solo notifiche accessibili.

ProjectResponse aggiunge `totalIssues`, `openIssues` (solo OPEN), `closedIssues` (solo CLOSED).
La dashboard calcola anche IN_PROGRESS e permette filtri locali combinati su tipo, stato e priorita'.
Creazione issue, cambio stato/assegnatario e commenti aggiornano la data di attivita' del progetto.

## Errori aggiuntivi

- 400 `ASSIGNEE_NOT_MEMBER`: account esistente ma estraneo al progetto.
- 400 `VALIDATION_ERROR` / `INVALID_REQUEST`: contenuto, ID o enum non validi.
- 403 `FORBIDDEN`: risorsa di un progetto non accessibile.
- 404 `NOT_FOUND`: issue, progetto, utente o notifica inesistente/non propria.
- 409 `INVALID_STATUS_TRANSITION`: cambio stato non consentito.

## Persistenza e frontend

`backend/sql/001-initial.sql` include le tre tabelle (`issues`, `issue_comments`, `notifications`) e relativi indici
con CREATE IF NOT EXISTS: e' compatibile con il database della milestone 1 e non elimina dati.
L'inizializzazione si esegue esplicitamente con `npm run db:init`; il server non usa sync/alter/force.
Non e' necessario ricreare il volume PostgreSQL.

Il frontend usa le API reali di default. La selezione assegnatari usa l'elenco dei membri,
accessibile agli USER, senza richiedere l'elenco globale degli account riservato agli ADMIN.
Gli errori delle operazioni vengono mostrati e il testo del commento viene conservato se l'invio fallisce.
Le notifiche si aggiornano al login, ogni 30 secondi, all'apertura del pannello e dopo un'operazione.
Aprire una notifica la marca come letta prima di navigare alla issue.

Demo mock disponibile con `VITE_USE_MOCK_API=true`; i cambiamenti della demo restano solo in memoria.
Upload, modifica del testo delle issue, eliminazione, riapertura, email/push e paginazione restano fuori ambito.

## Verifiche riproducibili

Con Node.js 22+, dipendenze installate e Docker Desktop aperto:
`powershell -ExecutionPolicy Bypass -File .\backend\test-docker.ps1` dalla root.
Lo script crea un PostgreSQL temporaneo su una porta locale casuale, esegue `npm test`
e rimuove il container e il suo volume al termine. Non usa i dati di sviluppo.

Copertura: regressione milestone 1, validazione, identita' server, isolamento tra progetti,
assegnatari validi, stati e idempotenza, concorrenza, commenti, notifiche private e lette,
revoca membership, statistiche e riavvio completo sullo stesso DB, inclusa compatibilita' con lo schema precedente.

Frontend: `npm.cmd --prefix frontend run lint` e `npm.cmd --prefix frontend run build`.

Prova manuale: creare progetto e due membri; creare un'issue assegnata al primo; verificare
con il suo login la notifica, aprirla, avanzare lo stato e commentare; verificare la notifica del reporter;
riavviare il backend e controllare dati/stato lettura; provare accesso diretto con un utente esterno.

Verifica della precedente implementazione Spring, il 18 ottobre 2026: 28 test backend passati (14 regressioni, 13 casi issue/commenti/notifiche,
1 upgrade/riavvio), lint e build frontend passati e JAR avviabile generato. Provate inoltre le API
via HTTP con JWT reali su PostgreSQL temporaneo: login, membri, creazione, commenti, stato, notifiche
lette, statistiche, accesso estraneo e revoca membership. La verifica visiva nel browser non e' stata eseguita.
