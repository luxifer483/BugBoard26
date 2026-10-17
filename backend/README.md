# BugBoard26 Backend

Java 21, Spring Boot 3.5.16, Spring Web, Validation, Spring Security con JWT,
Spring Data JPA/Hibernate e PostgreSQL. Package per funzionalita': auth, user, project, membership;
security e common contengono i servizi condivisi.

Contratto e regole: [milestone 1](../docs/api/milestone-1.md).

## Avvio locale da PowerShell

Aprire Docker Desktop. Dalla root del repository:

```powershell
docker compose -f .\infra\docker\docker-compose.yml up -d postgres
.\backend\run-dev.ps1
```

Lo script usa `C:\Program Files\Java\jdk-21` se disponibile per evitare che Maven usi il vecchio JAVA_HOME.
Legge inoltre la configurazione DB da `infra/docker/.env`, rispettando eventuali variabili DB gia' impostate.
Il DB Docker e' esposto su 5433 per evitare il conflitto con PostgreSQL installato su Windows sulla porta 5432.
In altri ambienti selezionare Java 21 ed eseguire dalla cartella backend:

```text
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

API su `http://localhost:8081/api` (8080 e' occupata da Apache sul computer di sviluppo).
Il profilo dev crea una sola volta l'admin:

- Email: `admin@bugboard26.dev`
- Password: `ChangeMe123!`

`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME` personalizzano il primo inserimento.
Un riavvio non sovrascrive gli account e non reimposta le password.
Le credenziali note e la chiave JWT predefinita sono esclusivamente di sviluppo.

In un secondo terminale dalla root:

```powershell
npm --prefix frontend run dev
```

Il frontend usa le API reali di default. L'admin puo' creare un progetto, aprirlo, entrare in
User Management, creare un utente e associarlo al progetto. Effettuando login con quell'utente
si vedranno solo i progetti a cui appartiene. Una nuova installazione non contiene progetti demo.

## Avvio backend e database in Docker

```powershell
docker compose -f .\infra\docker\docker-compose.yml up -d --build
```

Questo compose e' per sviluppo locale e usa il profilo dev. Espone la porta host 8081 sulla porta 8080 del container.
Non avviare anche il backend locale sulla stessa porta host 8081.
Il volume `postgres_data` conserva utenti, progetti e membership. `docker compose down` conserva il volume;
non usare `down -v` se si vogliono conservare i dati.

## Configurazione

| Variabile | Scopo |
| --- | --- |
| DB_URL | JDBC URL; in dev jdbc:postgresql://127.0.0.1:5433/bugboard26; il container backend usa postgres:5432 |
| DB_USERNAME | Utente DB, default bugboard_user |
| DB_PASSWORD | Password DB; default locale solo nel profilo dev |
| JWT_SECRET | Chiave HMAC di almeno 32 byte UTF-8; obbligatoria fuori dal profilo dev |
| CORS_ALLOWED_ORIGINS | Origini frontend ammesse, separate da virgola; default localhost:5173 e 127.0.0.1:5173 |
| SERVER_PORT | Porta HTTP: 8081 in dev locale, 8080 dentro il container |

`db/schema.sql` inizializza lo schema con SQL idempotente; Hibernate lo valida e non ricrea le tabelle.
Non e' stato introdotto Flyway. Le future modifiche strutturali richiederanno script ALTER versionati:
`CREATE TABLE IF NOT EXISTS` non aggiorna automaticamente tabelle gia' presenti.

## Test

Con Java 21 e Docker Desktop attivi, dalla cartella backend:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
mvn test
```

JUnit e Testcontainers avviano PostgreSQL isolati e temporanei. Non puliscono e non modificano
il database di sviluppo. Sono verificati login, password BCrypt, ruoli, token, validazione,
unicita', CORS, isolamento dei progetti e revoca delle membership. Un test chiude completamente
Spring Boot e lo riavvia sullo stesso DB per verificare la persistenza e l'idempotenza del bootstrap admin.

Questi test sono una base tecnica: il piano di test e la selezione dei quattro metodi non banali
richiesti dalla traccia restano da documentare nella consegna finale.

Riferimenti: [Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html),
[Spring Security JWT](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html).
