# Contratto API - milestone 1

Il backend attuale e' Node.js/Express con Sequelize. Gli endpoint e i formati JSON restano compatibili;
per avvio, struttura e autenticazione vedere [backend/README.md](../../backend/README.md).

Documento della prima milestone. Le funzionalita' indicate qui come successive sono ora
descritte nel [contratto della milestone 2](milestone-2.md), che aggiorna anche stati e statistiche.

Implementato: autenticazione, account, progetti e appartenenze. Base URL di sviluppo: `http://localhost:8081/api`.
Il backend e' indipendente da React. JSON e timestamp ISO 8601 UTC.

## Modello

| Entita' | Attributi persistenti | Regole |
| --- | --- | --- |
| User | id, fullName, email, passwordHash, role, createdAt | Email normalizzata minuscola e univoca; password BCrypt; ruolo globale USER oppure ADMIN |
| Project | id, name, description, status, createdAt, updatedAt | Nome e descrizione obbligatori; stato iniziale ACTIVE; ARCHIVED predisposto nel modello |
| ProjectMembership | id, project, user, joinedAt | Coppia progetto/utente univoca; nessun ruolo amministrativo locale al progetto |

Un utente ha zero o piu' appartenenze; un progetto ha zero o piu' appartenenze.
L'admin ha accesso globale, anche senza appartenenza. L'utente standard accede solo ai propri progetti.
La creazione di un progetto aggiunge automaticamente il creatore come membro.
Il modello implementato e' in `docs/diagrammi/backend-model-as-is.puml`.

## Endpoint e autorizzazioni

| Metodo | Percorso | Permesso | Risposta |
| --- | --- | --- | --- |
| POST | /auth/login | Pubblico | 200 LoginResponse |
| GET | /users/me | Autenticato | 200 UserResponse |
| GET | /users | ADMIN | 200 ListResponse di UserResponse |
| POST | /users | ADMIN | 201 UserResponse |
| GET | /projects | Autenticato; lista filtrata per appartenenza, globale per ADMIN | 200 ListResponse di ProjectResponse |
| POST | /projects | ADMIN | 201 ProjectResponse |
| GET | /projects/{projectId} | ADMIN oppure membro | 200 ProjectResponse |
| GET | /projects/{projectId}/members | ADMIN oppure membro | 200 ListResponse di MemberResponse |
| POST | /projects/{projectId}/members | ADMIN | 201 MemberResponse |
| DELETE | /projects/{projectId}/members/{userId} | ADMIN | 204 senza body |

Tutti gli endpoint protetti richiedono `Authorization: Bearer <token>`.
I controlli di accesso sono eseguiti lato server anche accedendo direttamente per ID.
Il JWT e' firmato HS256, con controllo firma, scadenza, issuer e audience. A ogni richiesta il ruolo
viene letto dal database. Una membership rimossa revoca immediatamente l'accesso al progetto.
Non e' previsto un endpoint pubblico di registrazione.

## Request e response

LoginRequest:

```json
{ "email": "admin@bugboard26.dev", "password": "ChangeMe123!" }
```

LoginResponse (token illustrativo):

```json
{
  "token": "<jwt-firmato>",
  "expiresAt": "2026-10-17T12:00:00Z",
  "user": { "id": 1, "fullName": "BugBoard Administrator", "email": "admin@bugboard26.dev", "role": "ADMIN", "avatarUrl": "" }
}
```

CreateUserRequest:

```json
{ "fullName": "Mario Rossi", "email": "mario@example.com", "password": "Example123!", "role": "USER" }
```

`fullName`: non vuoto, massimo 120 caratteri. `email`: valida, massimo 254 caratteri.
`password`: almeno 8 caratteri, massimo 72 byte UTF-8 (limite BCrypt).
`role`: esattamente USER o ADMIN, obbligatorio. La risposta UserResponse ha la stessa forma
di `user` nel login; password e hash non sono mai restituiti. `avatarUrl` e' vuoto finche' non sara' implementato il profilo.

CreateProjectRequest:

```json
{ "name": "BugBoard26", "description": "Progetto di ingegneria del software" }
```

Nome non vuoto, massimo 120 caratteri; descrizione non vuota, massimo 2000 caratteri.

ProjectResponse:

```json
{
  "id": 1, "name": "BugBoard26", "description": "Progetto di ingegneria del software",
  "status": "ACTIVE", "memberCount": 1,
  "createdAt": "2026-10-17T11:00:00Z", "updatedAt": "2026-10-17T11:00:00Z"
}
```

AddMemberRequest: `userId` positivo e obbligatorio; progetto identificato dal percorso.
Il ruolo non viene assegnato nella membership: e' il ruolo globale dell'account.

```json
{ "userId": 2 }
```

MemberResponse:

```json
{ "projectId": 1, "userId": 2, "fullName": "Mario Rossi", "email": "mario@example.com", "role": "USER", "joinedAt": "2026-10-17T11:05:00Z" }
```

Tutte le liste hanno forma `{ "items": [...], "totalCount": 2 }` e in questa milestone non sono paginate.

## Errori

```json
{
  "timestamp": "2026-10-17T11:00:00Z", "status": 400,
  "code": "VALIDATION_ERROR", "message": "Check the submitted fields.",
  "path": "/api/users", "errors": { "email": "must be a well-formed email address" }
}
```

- 400: VALIDATION_ERROR, INVALID_REQUEST, INVALID_PASSWORD.
- 401: INVALID_CREDENTIALS per login fallito; UNAUTHORIZED per token mancante, alterato o scaduto.
- 403: FORBIDDEN per operazioni o progetti non autorizzati.
- 404: NOT_FOUND per risorse inesistenti.
- 409: EMAIL_EXISTS, ALREADY_MEMBER, CONFLICT; vincoli DB proteggono anche richieste concorrenti.

Il frontend elimina la sessione al logout e quando riceve 401 da una rotta protetta.
Il token stateless resta tecnicamente valido fino alla scadenza (1 ora); questa milestone non implementa revoca/refresh token.

## Funzionalita' successive

Issue, commenti, notifiche, profilo modificabile, statistiche issue e upload non sono ancora API implementate.
Il frontend reale mostra la panoramica del progetto e disabilita i controlli dipendenti dalle API mancanti.
Gli stati issue TODO/IN_PROGRESS/DONE e la priorita' facoltativa vanno uniformati nella milestone issue.

Creazione account e aggiunta al progetto sono due operazioni distinte: se la seconda fallisce,
l'account resta creato e si puo' riprovare con Add Existing User.
