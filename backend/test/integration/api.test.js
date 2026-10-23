// Verifica con QUnit le API Express su PostgreSQL reale, usando uno schema temporaneo dedicato.
import '../setup.js';
import QUnit from 'qunit';
import { randomUUID, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Set TEST_DATABASE_URL to a disposable PostgreSQL database, or run backend/test-docker.ps1.');
}
const schema = process.env.TEST_DB_SCHEMA;
let app, sequelize, User, Project, Membership, Issue, IssueImage, Comment, Notification;
let createToken, bootstrapAdmin, initializeSchema, initialSql, hash, png;
let server, base;
let admin, member, reviewer, outsider, project;
let adminToken, memberToken, reviewerToken, outsiderToken;

QUnit.module('Integrazione API e PostgreSQL', (hooks) => {
  // Installa lo stesso SQL di Spring nello schema isolato, mai nel database di sviluppo.
  async function applySql(sql = initialSql) {
    await sequelize.transaction(async (transaction) => {
      await sequelize.query("SELECT set_config('search_path', $schema, true)", { bind: { schema }, transaction });
      await sequelize.query(sql, { transaction });
    });
  }

  // Esegue il comando di migrazione su uno schema di prova e ne controlla l'esito.
  async function runInitializer(assert, targetSchema) {
    const child = spawn(process.execPath, ['scripts/init-db.js'], { cwd: new URL('../..', import.meta.url),
      env: { ...process.env, TEST_DB_SCHEMA: targetSchema }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stderr.on('data', (chunk) => { output += chunk; });
    const [code] = await once(child, 'exit');
    assert.strictEqual(code, 0, output);
  }

  // Carica i moduli asincroni, prepara lo schema temporaneo e avvia Express solo per questa suite.
  hooks.before(async () => {
    ({ default: app } = await import('../../src/app.js'));
    ({ sequelize, User, Project, Membership, Issue, IssueImage, Comment, Notification } = await import('../../src/models/index.js'));
    ({ createToken } = await import('../../src/services/auth.js'));
    ({ bootstrapAdmin } = await import('../../src/services/bootstrap.js'));
    ({ initializeSchema } = await import('../../src/services/schema.js'));
    initialSql = await readFile(new URL('../../sql/001-initial.sql', import.meta.url), 'utf8');
    hash = await bcrypt.hash('Password123!', 4);
    png = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#346799' } }).png().toBuffer();
    await sequelize.authenticate();
    await sequelize.getQueryInterface().createSchema(schema);
    await initializeSchema();
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}/api`;
  });

  // Chiude il server e rimuove soltanto lo schema casuale creato dalla suite.
  hooks.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    // Rimuove solo lo schema con il nome casuale generato da questa esecuzione.
    await sequelize.getQueryInterface().dropSchema(schema);
    await sequelize.close();
  });

  // Prepara account e progetto nuovi per evitare dipendenze dai dati dei test precedenti.
  hooks.beforeEach(async () => {
    const suffix = randomUUID();
    [admin, member, reviewer, outsider] = await Promise.all(['ADMIN', 'USER', 'USER', 'USER'].map((role, index) =>
      User.create({ fullName: `User ${index}`, email: `${index}-${suffix}@example.test`, passwordHash: hash, role })));
    [adminToken, memberToken, reviewerToken, outsiderToken] = [admin, member, reviewer, outsider].map((user) => createToken(user).token);
    project = await Project.create({ name: 'Test project', description: 'Disposable verification' });
    await Membership.bulkCreate([{ projectId: project.id, userId: member.id }, { projectId: project.id, userId: reviewer.id }]);
  });

  // Invia una vera richiesta HTTP senza simulare controller, autenticazione o database.
  async function call(assert, method, path, token, input, expected = 200, headers = {}) {
    const multipart = input instanceof FormData;
    const response = await fetch(base + path, { method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(input !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(input === undefined ? {} : { body: multipart ? input : JSON.stringify(input) }) });
    const content = await response.text();
    assert.strictEqual(response.status, expected, `${method} ${path}: ${content}`);
    return content ? JSON.parse(content) : null;
  }

  // Prepara dati validi di partenza da variare nei singoli casi di test.
  function payload(assigneeId = null) {
    return { projectId: Number(project.id), title: 'Test issue', description: 'Description', type: 'BUG', priority: 'HIGH', assigneeId };
  }

  // Salva una issue attraverso la vera API e verifica la risposta di creazione.
  async function createIssue(assert, token = adminToken, assigneeId = null) {
    return call(assert, 'POST', '/issues', token, payload(assigneeId), 201);
  }

  // Prepara una vera richiesta multipart, come il selettore di file del browser.
  function imageUpload(data = png, type = 'image/png', values = payload()) {
    const form = new FormData();
    for (const [name, value] of Object.entries(values)) {
      if (value !== null && value !== undefined) form.append(name, String(value));
    }
    if (data !== null) form.append('image', new Blob([data], { type }), 'screenshot');
    return form;
  }

  // Verifica il salvataggio e il download protetto dei tre formati di immagine consentiti.
  QUnit.test('PNG, JPEG and WebP images are saved with the issue and downloaded through an authenticated endpoint', async (assert) => {
    for (const format of ['png', 'jpeg', 'webp']) {
      const bytes = await sharp(png).toFormat(format).toBuffer();
      const type = `image/${format}`;
      const issue = await call(assert, 'POST', '/issues', memberToken, imageUpload(bytes, type), 201);
      assert.deepEqual(issue.image, { contentType: type });
      assert.strictEqual((await call(assert, 'GET', `/issues/${issue.id}`, reviewerToken)).image.contentType, type);
      const listed = (await call(assert, 'GET', `/projects/${project.id}/issues`, memberToken)).items.find((item) => item.id === issue.id);
      assert.deepEqual(listed.image, { contentType: type });
      const response = await fetch(`${base}/issues/${issue.id}/image`, { headers: { Authorization: `Bearer ${reviewerToken}` } });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.headers.get('content-type'), type);
      assert.strictEqual(response.headers.get('cache-control'), 'private, no-store');
      assert.strictEqual(response.headers.get('x-content-type-options'), 'nosniff');
      const downloaded = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(downloaded).metadata();
      assert.strictEqual(metadata.format, format);
      assert.strictEqual(metadata.width, 8);
      assert.strictEqual(metadata.height, 6);
      assert.true((await IssueImage.findByPk(issue.id)).data.equals(downloaded), 'Byte salvati identici a quelli scaricati');
    }
  });

  // Verifica che immagine e priorita possano essere omesse nelle richieste JSON e multipart.
  QUnit.test('the image is optional for both JSON and multipart requests', async (assert) => {
    const { priority, ...withoutPriority } = payload();
    assert.strictEqual(priority, 'HIGH');
    for (const input of [withoutPriority, imageUpload(null, 'image/png', withoutPriority)]) {
      const issue = await call(assert, 'POST', '/issues', memberToken, input, 201);
      assert.strictEqual(issue.image, null);
      assert.strictEqual(issue.priority, null);
      assert.strictEqual(await IssueImage.findByPk(issue.id), null);
      assert.strictEqual((await call(assert, 'GET', `/issues/${issue.id}/image`, memberToken, undefined, 404)).code, 'NOT_FOUND');
    }
  });

  // Verifica che accesso e revoca dell'appartenenza proteggano anche gli allegati.
  QUnit.test('image uploads and downloads require login and project access, including after membership revocation', async (assert) => {
    const before = await Issue.count();
    await call(assert, 'POST', '/issues', null, imageUpload(), 401);
    await call(assert, 'POST', '/issues', outsiderToken, imageUpload(), 403);
    assert.strictEqual(await Issue.count(), before);
    const issue = await call(assert, 'POST', '/issues', memberToken, imageUpload(), 201);
    await call(assert, 'GET', `/issues/${issue.id}/image`, null, undefined, 401);
    await call(assert, 'GET', `/issues/${issue.id}/image`, outsiderToken, undefined, 403);
    const adminResponse = await fetch(`${base}/issues/${issue.id}/image`, { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.strictEqual(adminResponse.status, 200);
    await adminResponse.arrayBuffer();
    await call(assert, 'DELETE', `/projects/${project.id}/members/${member.id}`, adminToken, undefined, 204);
    await call(assert, 'GET', `/issues/${issue.id}/image`, memberToken, undefined, 403);
  });

  // Verifica che file falsi, corrotti o con formato non coerente non vengano salvati.
  QUnit.test('fake, corrupt, unsupported and mismatched image files do not create issues or images', async (assert) => {
    const before = await Issue.count();
    const images = await IssueImage.count();
    for (const [data, type] of [[Buffer.from('not an image'), 'image/png'], [png, 'image/jpeg'],
      [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>'), 'image/png'],
      [png.subarray(0, 40), 'image/png'], [Buffer.alloc(0), 'image/png'], [png, 'image/gif'], [png, 'text/html']]) {
      assert.strictEqual((await call(assert, 'POST', '/issues', memberToken, imageUpload(data, type), 400)).code, 'INVALID_IMAGE');
    }
    assert.strictEqual(await Issue.count(), before);
    assert.strictEqual(await IssueImage.count(), images);
  });

  // Verifica il limite di 5 MB e il rifiuto di file multipli o campi inattesi.
  QUnit.test('images over 5 MB and requests with multiple or unexpected files are rejected before saving', async (assert) => {
    const before = await Issue.count();
    assert.strictEqual((await call(assert, 'POST', '/issues', memberToken, imageUpload(Buffer.alloc(5 * 1024 * 1024 + 1)), 413)).code,
      'IMAGE_TOO_LARGE');
    const multiple = imageUpload();
    multiple.append('image', new Blob([png], { type: 'image/png' }), 'second.png');
    await call(assert, 'POST', '/issues', memberToken, multiple, 400);
    const wrongField = imageUpload(null);
    wrongField.append('attachment', new Blob([png], { type: 'image/png' }), 'unexpected.png');
    await call(assert, 'POST', '/issues', memberToken, wrongField, 400);
    assert.strictEqual(await Issue.count(), before);
  });

  // Verifica il limite di pixel e la rimozione dei metadati privati dalle immagini.
  QUnit.test('image decoding enforces the pixel limit and removes private metadata', async (assert) => {
    const large = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: '#ffffff' } }).png().toBuffer();
    await call(assert, 'POST', '/issues', memberToken, imageUpload(large), 400);
    const tagged = await sharp(png).withMetadata({ exif: { IFD0: { Artist: 'Private author' } } }).png().toBuffer();
    assert.ok((await sharp(tagged).metadata()).exif);
    const issue = await call(assert, 'POST', '/issues', memberToken, imageUpload(tagged), 201);
    const metadata = await sharp((await IssueImage.findByPk(issue.id)).data).metadata();
    assert.strictEqual(metadata.exif, undefined);
  });

  // Verifica che errori nei dati o nelle notifiche non lascino issue o immagini parziali.
  QUnit.test('invalid issue fields and notification failures leave no orphan image or partial issue', async (assert) => {
    const issues = await Issue.count();
    const images = await IssueImage.count();
    const savedProject = await Project.findByPk(project.id);
    await call(assert, 'POST', '/issues', memberToken, imageUpload(png, 'image/png', { ...payload(), title: ' ' }), 400);
    const original = Notification.create;
    Notification.create = async () => { throw new Error('Simulated image issue notification failure'); };
    try {
      await call(assert, 'POST', '/issues', memberToken, imageUpload(png, 'image/png', payload(Number(reviewer.id))), 500);
    } finally { Notification.create = original; }
    assert.strictEqual(await Issue.count(), issues);
    assert.strictEqual(await IssueImage.count(), images);
    assert.strictEqual((await Project.findByPk(project.id)).updatedAt.toISOString(), savedProject.updatedAt.toISOString());
  });

  // Verifica che ripetere l'inizializzazione conservi i dati e i byte degli allegati.
  QUnit.test('repeated initialization preserves the existing image bytes and issue data', async (assert) => {
    const issue = await call(assert, 'POST', '/issues', memberToken, imageUpload(), 201);
    const saved = await IssueImage.findByPk(issue.id);
    await initializeSchema();
    await initializeSchema();
    assert.true((await IssueImage.findByPk(issue.id)).data.equals(saved.data), 'Byte conservati dopo inizializzazione');
    assert.strictEqual((await Issue.findByPk(issue.id)).title, issue.title);
  });

  // Verifica la normalizzazione della email e la restituzione di una sessione senza password.
  QUnit.test('login normalizes email and returns a signed token and safe account', async (assert) => {
    const result = await call(assert, 'POST', '/auth/login', null, { email: admin.email.toUpperCase(), password: 'Password123!' });
    assert.strictEqual(result.user.id, Number(admin.id));
    assert.strictEqual(result.user.role, 'ADMIN');
    assert.strictEqual(result.user.passwordHash, undefined);
    assert.strictEqual(result.user.password, undefined);
    assert.ok(Date.parse(result.expiresAt) > Date.now());
    assert.strictEqual((await call(assert, 'GET', '/users/me', result.token)).id, Number(admin.id));
  });

  // Verifica che password errata e account inesistente producano lo stesso errore.
  QUnit.test('wrong password and unknown email return the same failure', async (assert) => {
    for (const email of [admin.email, 'missing@example.test']) {
      const error = await call(assert, 'POST', '/auth/login', null, { email, password: 'wrong' }, 401);
      assert.strictEqual(error.code, 'INVALID_CREDENTIALS');
    }
  });

  // Verifica il rifiuto di password multibyte oltre il limite di BCrypt.
  QUnit.test('login rejects a multibyte password beyond the BCrypt byte limit', async (assert) => {
    const error = await call(assert, 'POST', '/auth/login', null, { email: admin.email, password: 'é'.repeat(40) }, 401);
    assert.strictEqual(error.code, 'INVALID_CREDENTIALS');
  });

  // Verifica la compatibilita con gli hash e i token del precedente backend Spring.
  QUnit.test('existing BCrypt 2a hashes and Spring-shaped HS256 tokens remain usable', async (assert) => {
    await member.update({ passwordHash: hash.replace('$2b$', '$2a$') });
    const session = await call(assert, 'POST', '/auth/login', null, { email: member.email, password: 'Password123!' });
    assert.strictEqual(session.user.id, Number(member.id));
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const issued = Math.floor(Date.now() / 1000);
    const unsigned = `${encode({ alg: 'HS256' })}.${encode({ sub: String(member.id), iss: 'bugboard26',
      aud: ['bugboard26-frontend'], iat: issued, exp: issued + 3600 })}`;
    const legacy = `${unsigned}.${createHmac('sha256', process.env.JWT_SECRET).update(unsigned).digest('base64url')}`;
    assert.strictEqual((await call(assert, 'GET', '/users/me', legacy)).id, Number(member.id));
  });

  // Verifica il rifiuto di token assenti, alterati, scaduti o con firma e destinatario errati.
  QUnit.test('missing, altered, expired and wrongly signed tokens are rejected', async (assert) => {
    for (const token of [undefined, `${adminToken}invalid`, jwt.sign({ sub: String(admin.id) }, 'wrong-key')]) {
      assert.strictEqual((await call(assert, 'GET', '/projects', token, undefined, 401)).code, 'UNAUTHORIZED');
    }
    for (const overrides of [{ expiresIn: -3600 }, { issuer: 'other' }, { audience: 'other' }]) {
      const token = jwt.sign({}, process.env.JWT_SECRET, { algorithm: 'HS256', subject: String(admin.id),
        issuer: 'bugboard26', audience: 'bugboard26-frontend', expiresIn: 3600, ...overrides });
      await call(assert, 'GET', '/users/me', token, undefined, 401);
    }
  });

  // Verifica che i permessi seguano il ruolo corrente nel database anche con lo stesso token.
  QUnit.test('current user and privileges are reloaded from the database on each request', async (assert) => {
    await call(assert, 'GET', '/users', memberToken, undefined, 403);
    await member.update({ role: 'ADMIN' });
    await call(assert, 'GET', '/users', memberToken);
    await member.update({ role: 'USER' });
    await call(assert, 'GET', '/users', memberToken, undefined, 403);
  });

  // Verifica che l'amministratore crei utenti con password salvata come hash e email univoca normalizzata.
  QUnit.test('admin creates users with hashed passwords and unique normalized email', async (assert) => {
    const input = { fullName: 'New user', email: `NEW-${randomUUID()}@example.test`, password: 'Password123!', role: 'USER' };
    const result = await call(assert, 'POST', '/users', adminToken, input, 201);
    assert.strictEqual(result.email, input.email.toLowerCase());
    const saved = await User.findByPk(result.id);
    assert.notStrictEqual(saved.passwordHash, input.password);
    assert.ok(await bcrypt.compare(input.password, saved.passwordHash));
    assert.strictEqual((await call(assert, 'POST', '/users', adminToken, input, 409)).code, 'EMAIL_EXISTS');
  });

  // Verifica che un utente normale non possa elencare account o creare utenti e progetti.
  QUnit.test('normal users cannot enumerate accounts or create users or projects', async (assert) => {
    await call(assert, 'GET', '/users', memberToken, undefined, 403);
    await call(assert, 'POST', '/users', memberToken, { fullName: 'Escalation', email: 'x@example.test', password: 'Password123!', role: 'ADMIN' }, 403);
    await call(assert, 'POST', '/projects', memberToken, { name: 'Forbidden', description: 'Description' }, 403);
  });

  // Verifica separatamente gli errori di nome, email, password e ruolo nella creazione utente.
  QUnit.test('user validation rejects blank names, invalid email, roles and BCrypt truncation', async (assert) => {
    const valid = { fullName: 'User', email: `${randomUUID()}@example.test`, password: 'Password123!', role: 'USER' };
    for (const invalid of [{ fullName: ' ' }, { email: 'invalid' }, { password: 'short' },
      { password: 'é'.repeat(40) }, { role: 'QA' }]) {
      const error = await call(assert, 'POST', '/users', adminToken, { ...valid, ...invalid }, 400);
      assert.ok(error.code);
      assert.strictEqual(error.path, '/api/users');
    }
  });

  // Verifica che creare un progetto aggiunga anche l'amministratore ai suoi membri.
  QUnit.test('project creation also creates the administrator membership', async (assert) => {
    const created = await call(assert, 'POST', '/projects', adminToken, { name: ' New project ', description: ' Description ' }, 201);
    assert.strictEqual(created.name, 'New project');
    assert.strictEqual(created.memberCount, 1);
    assert.strictEqual(created.totalIssues, 0);
    const members = await call(assert, 'GET', `/projects/${created.id}/members`, adminToken);
    assert.strictEqual(members.items[0].userId, Number(admin.id));
  });

  // Verifica la visibilita dei progetti per membri e amministratori.
  QUnit.test('project lists and direct access enforce membership; admin access is global', async (assert) => {
    const other = await Project.create({ name: 'Private project', description: 'Description' });
    const visible = await call(assert, 'GET', '/projects', memberToken);
    assert.deepEqual(visible.items.map((item) => item.id), [Number(project.id)]);
    await call(assert, 'GET', `/projects/${other.id}`, memberToken, undefined, 403);
    await call(assert, 'GET', `/projects/${other.id}/members`, memberToken, undefined, 403);
    await call(assert, 'GET', `/projects/${other.id}`, adminToken);
  });

  // Verifica aggiunta, duplicazione e revoca immediata dell'appartenenza al progetto.
  QUnit.test('membership creation, duplicate detection and immediate revocation work', async (assert) => {
    await call(assert, 'POST', `/projects/${project.id}/members`, memberToken, { userId: Number(outsider.id) }, 403);
    await call(assert, 'POST', `/projects/${project.id}/members`, adminToken, { userId: Number(outsider.id) }, 201);
    assert.strictEqual((await call(assert, 'POST', `/projects/${project.id}/members`, adminToken, { userId: Number(outsider.id) }, 409)).code, 'ALREADY_MEMBER');
    await call(assert, 'GET', `/projects/${project.id}`, outsiderToken);
    await call(assert, 'DELETE', `/projects/${project.id}/members/${outsider.id}`, memberToken, undefined, 403);
    await call(assert, 'DELETE', `/projects/${project.id}/members/${outsider.id}`, adminToken, undefined, 204);
    await call(assert, 'GET', `/projects/${project.id}`, outsiderToken, undefined, 403);
  });

  // Verifica che identificatori malformati o oltre il limite non provochino errori SQL.
  QUnit.test('malformed and out-of-range identifiers are handled without SQL errors', async (assert) => {
    for (const value of ['not-a-number', '0', '-1', '1.5', '9223372036854775808']) {
      await call(assert, 'GET', `/projects/${value}`, adminToken, undefined, 400);
    }
    await call(assert, 'GET', '/projects/9223372036854775807', adminToken, undefined, 404);
    await call(assert, 'GET', '/issues/9223372036854775807', memberToken, undefined, 404);
  });

  // Verifica che CORS consenta il frontend e PATCH e rifiuti origini estranee.
  QUnit.test('CORS allows the frontend and PATCH, and rejects an unrelated origin', async (assert) => {
    const allowed = await fetch(`${base}/issues/1/status`, { method: 'OPTIONS', headers: {
      Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'PATCH',
      'Access-Control-Request-Headers': 'authorization,content-type',
    } });
    assert.strictEqual(allowed.status, 204);
    assert.strictEqual(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.true(/PATCH/.test(allowed.headers.get('access-control-allow-methods')));
    await call(assert, 'OPTIONS', '/projects', null, undefined, 403, { Origin: 'https://untrusted.example',
      'Access-Control-Request-Method': 'GET' });
  });

  // Verifica che autore, stato iniziale e date della nuova issue siano stabiliti dal server.
  QUnit.test('member creates an issue while reporter, status and dates remain server controlled', async (assert) => {
    const issue = await call(assert, 'POST', '/issues', memberToken, { ...payload(Number(member.id)),
      reporter: { id: Number(admin.id) }, status: 'CLOSED', createdAt: '2000-01-01T00:00:00Z' }, 201);
    assert.strictEqual(issue.reporter.id, Number(member.id));
    assert.strictEqual(issue.status, 'TODO');
    assert.strictEqual(issue.code, `BUG-26-${issue.id}`);
    assert.ok(!issue.createdAt.startsWith('2000'));
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).unreadCount, 0);
  });

  // Verifica che si possano creare issue di tutti i quattro tipi previsti.
  QUnit.test('all four issue types remain supported', async (assert) => {
    for (const type of ['BUG', 'QUESTION', 'DOCUMENTATION', 'FEATURE']) {
      const issue = await call(assert, 'POST', '/issues', memberToken, { ...payload(), type }, 201);
      assert.strictEqual(issue.type, type);
    }
  });

  // Verifica che la priorita sia facoltativa e conservi tutti i valori espliciti consentiti.
  QUnit.test('priority is optional and valid explicit priorities are preserved', async (assert) => {
    const { priority, ...withoutPriority } = payload();
    assert.strictEqual(priority, 'HIGH');
    for (const input of [withoutPriority, { ...withoutPriority, priority: null }]) {
      const issue = await call(assert, 'POST', '/issues', memberToken, input, 201);
      assert.strictEqual(issue.priority, null);
      assert.strictEqual(issue.status, 'TODO');
      assert.strictEqual((await call(assert, 'GET', `/issues/${issue.id}`, memberToken)).priority, null);
      assert.strictEqual((await Issue.findByPk(issue.id)).priority, null);
    }
    for (const value of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
      const issue = await call(assert, 'POST', '/issues', memberToken, { ...withoutPriority, priority: value }, 201);
      assert.strictEqual(issue.priority, value);
    }
  });

  // Verifica che campi della issue non validi non producano scritture nel database.
  QUnit.test('invalid issue fields are rejected without writing rows', async (assert) => {
    const before = await Issue.count();
    for (const invalid of [{ title: ' ' }, { description: 'x'.repeat(10001) }, { type: 'UNKNOWN' },
      { priority: '' }, { priority: false }, { priority: 0 }, { priority: {} },
      { priority: 'UNKNOWN' }, { projectId: -1 }, { assigneeId: true }]) {
      await call(assert, 'POST', '/issues', memberToken, { ...payload(), ...invalid }, 400);
    }
    assert.strictEqual(await Issue.count(), before);
  });

  // Verifica che l'assegnatario esista e sia membro del progetto anche se amministratore.
  QUnit.test('assignee must belong to the project, including administrator accounts', async (assert) => {
    for (const user of [outsider, admin]) {
      const error = await call(assert, 'POST', '/issues', memberToken, payload(Number(user.id)), 400);
      assert.strictEqual(error.code, 'ASSIGNEE_NOT_MEMBER');
    }
    await call(assert, 'POST', '/issues', memberToken, payload(9223372036854775807n.toString()), 404);
  });

  // Verifica che un utente esterno non possa leggere, commentare o modificare issue.
  QUnit.test('outsiders cannot read or change issues and comments', async (assert) => {
    const issue = await createIssue(assert);
    for (const path of [`/projects/${project.id}/issues`, `/issues/${issue.id}`, `/issues/${issue.id}/comments`]) {
      await call(assert, 'GET', path, outsiderToken, undefined, 403);
    }
    await call(assert, 'POST', '/issues', outsiderToken, payload(), 403);
    await call(assert, 'POST', `/issues/${issue.id}/comments`, outsiderToken, { content: 'intrusion' }, 403);
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, outsiderToken, { status: 'IN_PROGRESS' }, 403);
    await call(assert, 'PATCH', `/issues/${issue.id}/assignee`, outsiderToken, { assigneeId: Number(member.id) }, 403);
    assert.strictEqual((await call(assert, 'GET', '/issues', outsiderToken)).totalCount, 0);
    assert.strictEqual((await call(assert, 'GET', '/issues', memberToken)).totalCount, 1);
  });

  // Verifica che solo l'assegnatario cambi stato, senza eccezioni per autore o amministratore.
  QUnit.test('only the assignee can update status, including when the reporter or an admin is a project member', async (assert) => {
    await Membership.create({ projectId: project.id, userId: admin.id });
    const issue = await createIssue(assert, memberToken, Number(reviewer.id));
    const savedIssue = await Issue.findByPk(issue.id);
    const savedProject = await Project.findByPk(project.id);
    const notifications = await Notification.count({ where: { issueId: issue.id } });
    for (const token of [memberToken, adminToken]) {
      for (const status of ['TODO', 'IN_PROGRESS', 'CLOSED']) {
        const error = await call(assert, 'PATCH', `/issues/${issue.id}/status`, token,
          { status, assigneeId: Number(member.id) }, 403);
        assert.strictEqual(error.code, 'NOT_ISSUE_ASSIGNEE');
      }
    }
    const unchanged = await Issue.findByPk(issue.id);
    assert.strictEqual(unchanged.status, 'TODO');
    assert.strictEqual(String(unchanged.assigneeId), String(reviewer.id));
    assert.strictEqual(unchanged.updatedAt.toISOString(), savedIssue.updatedAt.toISOString());
    assert.strictEqual((await Project.findByPk(project.id)).updatedAt.toISOString(), savedProject.updatedAt.toISOString());
    assert.strictEqual(await Notification.count({ where: { issueId: issue.id } }), notifications);
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, reviewerToken, { status: 'IN_PROGRESS' });
  });

  // Verifica che una issue senza assegnatario non possa avanzare di stato.
  QUnit.test('unassigned issues cannot change status until an assignee is chosen', async (assert) => {
    const issue = await createIssue(assert, memberToken);
    for (const token of [memberToken, reviewerToken, adminToken]) {
      for (const status of ['TODO', 'IN_PROGRESS']) {
        assert.strictEqual((await call(assert, 'PATCH', `/issues/${issue.id}/status`, token, { status }, 403)).code,
          'NOT_ISSUE_ASSIGNEE');
      }
    }
    assert.strictEqual((await Issue.findByPk(issue.id)).status, 'TODO');
    assert.strictEqual(await Notification.count({ where: { issueId: issue.id } }), 0);
    await call(assert, 'PATCH', `/issues/${issue.id}/assignee`, memberToken, { assigneeId: Number(reviewer.id) });
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, reviewerToken, { status: 'IN_PROGRESS' });
  });

  // Verifica che riassegnazione e rimozione trasferiscano subito il permesso di cambiare stato.
  QUnit.test('reassignment and unassignment immediately change who can update status', async (assert) => {
    const issue = await createIssue(assert, memberToken, Number(member.id));
    await call(assert, 'PATCH', `/issues/${issue.id}/assignee`, memberToken, { assigneeId: Number(reviewer.id) });
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'IN_PROGRESS' }, 403);
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, reviewerToken, { status: 'IN_PROGRESS' });
    await call(assert, 'PATCH', `/issues/${issue.id}/assignee`, reviewerToken, { assigneeId: null });
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, reviewerToken, { status: 'CLOSED' }, 403);
    await call(assert, 'PATCH', `/issues/${issue.id}/assignee`, reviewerToken, { assigneeId: Number(member.id) });
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, reviewerToken, { status: 'IN_PROGRESS' }, 403);
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, reviewerToken, { status: 'CLOSED' }, 403);
    assert.strictEqual((await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'CLOSED' })).status, 'CLOSED');
  });

  // Verifica che un amministratore assegnatario possa risolvere la issue e notificare il reporter.
  QUnit.test('an administrator can change status when they are the assignee', async (assert) => {
    await Membership.create({ projectId: project.id, userId: admin.id });
    const issue = await createIssue(assert, memberToken, Number(admin.id));
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'IN_PROGRESS' }, 403);
    for (const status of ['IN_PROGRESS', 'CLOSED']) {
      assert.strictEqual((await call(assert, 'PATCH', `/issues/${issue.id}/status`, adminToken, { status })).status, status);
    }
    const feed = await call(assert, 'GET', '/notifications', memberToken);
    assert.strictEqual(feed.items.filter((item) => item.issueId === issue.id && /resolved/.test(item.message)).length, 1);
  });

  // Verifica passaggi di stato consentiti, richieste ripetute e rifiuto dei passaggi vietati.
  QUnit.test('the assignee can advance status with the existing transitions and idempotency', async (assert) => {
    const issue = await createIssue(assert, adminToken, Number(member.id));
    assert.strictEqual((await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'CLOSED' }, 409)).code, 'INVALID_STATUS_TRANSITION');
    for (const status of ['IN_PROGRESS', 'IN_PROGRESS', 'CLOSED', 'CLOSED']) {
      assert.strictEqual((await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status })).status, status);
    }
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'TODO' }, 409);
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'OPEN' }, 400);
    assert.strictEqual((await call(assert, 'GET', '/notifications', adminToken)).unreadCount, 2);
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).unreadCount, 1);
  });

  // Verifica che riassegnazioni ripetute non duplichino le notifiche.
  QUnit.test('reassignment and unassignment are saved without duplicate notifications', async (assert) => {
    const issue = await createIssue(assert);
    for (let i = 0; i < 2; i++) {
      const result = await call(assert, 'PATCH', `/issues/${issue.id}/assignee`, memberToken, { assigneeId: Number(reviewer.id) });
      assert.strictEqual(result.assignee.id, Number(reviewer.id));
    }
    assert.strictEqual((await call(assert, 'GET', '/notifications', reviewerToken)).unreadCount, 1);
    await call(assert, 'PATCH', `/issues/${issue.id}/assignee`, memberToken, { assigneeId: Number(outsider.id) }, 400);
    assert.strictEqual((await call(assert, 'PATCH', `/issues/${issue.id}/assignee`, memberToken, { assigneeId: null })).assignee, null);
    assert.strictEqual((await call(assert, 'GET', `/issues/${issue.id}`, adminToken)).assignee, null);
  });

  // Verifica autore autenticato, ordinamento e controlli sul contenuto dei commenti.
  QUnit.test('comments use the authenticated author, are ordered and validate content', async (assert) => {
    const issue = await createIssue(assert, adminToken, Number(member.id));
    const first = await call(assert, 'POST', `/issues/${issue.id}/comments`, reviewerToken,
      { content: ' First comment ', author: { id: Number(admin.id) } }, 201);
    assert.strictEqual(first.author.id, Number(reviewer.id));
    assert.strictEqual(first.content, 'First comment');
    await call(assert, 'POST', `/issues/${issue.id}/comments`, memberToken, { content: 'Second comment' }, 201);
    for (const content of [' ', 'x'.repeat(5001), null]) {
      await call(assert, 'POST', `/issues/${issue.id}/comments`, memberToken, { content }, 400);
    }
    const comments = await call(assert, 'GET', `/issues/${issue.id}/comments`, memberToken);
    assert.deepEqual(comments.items.map((comment) => comment.content), ['First comment', 'Second comment']);
    assert.strictEqual((await call(assert, 'GET', '/notifications', adminToken)).unreadCount, 2);
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).unreadCount, 2);
  });

  // Verifica che le notifiche escludano l'attore e non duplichino reporter e assegnatario.
  QUnit.test('notifications deduplicate reporter/assignee and exclude the actor', async (assert) => {
    const issue = await createIssue(assert, memberToken, Number(member.id));
    await call(assert, 'POST', `/issues/${issue.id}/comments`, reviewerToken, { content: 'Please review' }, 201);
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).totalCount, 1);
    assert.strictEqual((await call(assert, 'GET', '/notifications', reviewerToken)).totalCount, 0);
  });

  // Verifica la notifica unica anche quando il reporter risolve la propria issue.
  QUnit.test('resolution notifies a reporter who closes their own assigned issue exactly once', async (assert) => {
    const issue = await createIssue(assert, memberToken, Number(member.id));
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'IN_PROGRESS' });
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).totalCount, 0);
    for (let i = 0; i < 2; i++) {
      await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'CLOSED' });
    }
    const feed = await call(assert, 'GET', '/notifications', memberToken);
    assert.strictEqual(feed.totalCount, 1);
    assert.strictEqual(feed.unreadCount, 1);
    assert.strictEqual(feed.items[0].issueId, issue.id);
    assert.true(/resolved/.test(feed.items[0].message));
    assert.strictEqual(await Notification.count({ where: { issueId: issue.id, kind: 'RESOLUTION' } }), 1);
  });

  // Verifica che un ex membro riceva la risoluzione senza riottenere accesso al progetto.
  QUnit.test('former reporters receive and read resolution notices without regaining project access', async (assert) => {
    const issue = await createIssue(assert, memberToken, Number(reviewer.id));
    await call(assert, 'POST', `/issues/${issue.id}/comments`, reviewerToken, { content: 'Before revocation' }, 201);
    await call(assert, 'DELETE', `/projects/${project.id}/members/${member.id}`, adminToken, undefined, 204);
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, reviewerToken, { status: 'IN_PROGRESS' });
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).totalCount, 0);
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, reviewerToken, { status: 'CLOSED' });
    const feed = await call(assert, 'GET', '/notifications', memberToken);
    assert.strictEqual(feed.totalCount, 1);
    assert.strictEqual(feed.unreadCount, 1);
    assert.strictEqual(feed.items[0].issueId, null);
    assert.true(/resolved/.test(feed.items[0].message));
    const notificationId = feed.items[0].id;
    for (let i = 0; i < 2; i++) {
      const read = await call(assert, 'PATCH', `/notifications/${notificationId}/read`, memberToken);
      assert.strictEqual(read.read, true);
      assert.strictEqual(read.issueId, null);
    }
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).unreadCount, 0);
    await call(assert, 'GET', `/issues/${issue.id}`, memberToken, undefined, 403);
    await call(assert, 'GET', `/issues/${issue.id}/comments`, memberToken, undefined, 403);
    await call(assert, 'PATCH', `/notifications/${notificationId}/read`, outsiderToken, undefined, 404);
    await call(assert, 'PATCH', `/notifications/${notificationId}/read`, adminToken, undefined, 404);
    await call(assert, 'POST', `/projects/${project.id}/members`, adminToken, { userId: Number(member.id) }, 201);
    const restored = (await call(assert, 'GET', '/notifications', memberToken)).items.find((item) => item.id === notificationId);
    assert.strictEqual(restored.issueId, issue.id);
  });

  // Verifica che la notifica di risoluzione resti leggibile dopo la revoca dell'appartenenza.
  QUnit.test('resolution notice stays visible if reporter membership is revoked after closure', async (assert) => {
    const issue = await createIssue(assert, memberToken, Number(reviewer.id));
    for (const status of ['IN_PROGRESS', 'CLOSED']) {
      await call(assert, 'PATCH', `/issues/${issue.id}/status`, reviewerToken, { status });
    }
    await call(assert, 'DELETE', `/projects/${project.id}/members/${member.id}`, adminToken, undefined, 204);
    const feed = await call(assert, 'GET', '/notifications', memberToken);
    assert.strictEqual(feed.totalCount, 1);
    assert.strictEqual(feed.items[0].issueId, null);
  });

  // Verifica che le notifiche siano private e possano essere segnate lette senza duplicazioni.
  QUnit.test('notifications remain private and marking read is idempotent', async (assert) => {
    await createIssue(assert, adminToken, Number(member.id));
    const feed = await call(assert, 'GET', '/notifications', memberToken);
    const id = feed.items[0].id;
    await call(assert, 'PATCH', `/notifications/${id}/read`, adminToken, undefined, 404);
    await call(assert, 'PATCH', `/notifications/${id}/read`, outsiderToken, undefined, 404);
    for (let i = 0; i < 2; i++) assert.strictEqual((await call(assert, 'PATCH', `/notifications/${id}/read`, memberToken)).read, true);
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).unreadCount, 0);
  });

  // Verifica che rimuovere un membro revochi subito accesso, commenti e cambio di stato.
  QUnit.test('membership removal revokes issue/comment access and hides notifications immediately', async (assert) => {
    const issue = await createIssue(assert, adminToken, Number(member.id));
    const notification = (await call(assert, 'GET', '/notifications', memberToken)).items[0];
    await call(assert, 'DELETE', `/projects/${project.id}/members/${member.id}`, adminToken, undefined, 204);
    await call(assert, 'GET', `/issues/${issue.id}`, memberToken, undefined, 403);
    await call(assert, 'POST', `/issues/${issue.id}/comments`, memberToken, { content: 'revoked' }, 403);
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'IN_PROGRESS' }, 403);
    await call(assert, 'PATCH', `/notifications/${notification.id}/read`, memberToken, undefined, 403);
    assert.strictEqual((await call(assert, 'GET', '/issues', memberToken)).totalCount, 0);
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).totalCount, 0);
    await call(assert, 'POST', `/issues/${issue.id}/comments`, reviewerToken, { content: 'after revocation' }, 201);
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).totalCount, 0);
  });

  // Verifica che le statistiche del progetto riflettano gli stati salvati delle issue.
  QUnit.test('project statistics reflect persistent issue states', async (assert) => {
    const issue = await createIssue(assert, adminToken, Number(member.id));
    await createIssue(assert, memberToken);
    let result = await call(assert, 'GET', `/projects/${project.id}`, memberToken);
    assert.strictEqual(result.totalIssues, 2); assert.strictEqual(result.openIssues, 2);
    for (const status of ['IN_PROGRESS', 'CLOSED']) await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status });
    result = await call(assert, 'GET', `/projects/${project.id}`, memberToken);
    assert.strictEqual(result.totalIssues, 2); assert.strictEqual(result.openIssues, 1); assert.strictEqual(result.closedIssues, 1);
  });

  // Verifica che due cambi di stato contemporanei identici non duplichino gli eventi.
  QUnit.test('concurrent identical status updates emit only one event', async (assert) => {
    const issue = await createIssue(assert, adminToken, Number(member.id));
    await Promise.all([1, 2].map(() => call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'IN_PROGRESS' })));
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).totalCount, 1);
    assert.strictEqual((await call(assert, 'GET', '/notifications', adminToken)).totalCount, 1);
  });

  // Verifica che due chiusure contemporanee generino una sola notifica di risoluzione.
  QUnit.test('concurrent closures emit a single resolution notice per reporter', async (assert) => {
    const issue = await createIssue(assert, memberToken, Number(member.id));
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'IN_PROGRESS' });
    await Promise.all([1, 2].map(() => call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'CLOSED' })));
    assert.strictEqual((await call(assert, 'GET', '/notifications', memberToken)).totalCount, 1);
  });

  // Verifica che un errore di notifica annulli stato della issue e data del progetto.
  QUnit.test('a notification write failure rolls back issue state and project timestamp', async (assert) => {
    const issue = await createIssue(assert, adminToken, Number(member.id));
    const savedProject = await Project.findByPk(project.id);
    const original = Notification.create;
    Notification.create = async () => { throw new Error('Simulated notification failure'); };
    try {
      await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'IN_PROGRESS' }, 500);
    } finally { Notification.create = original; }
    assert.strictEqual((await Issue.findByPk(issue.id)).status, 'TODO');
    assert.strictEqual((await Project.findByPk(project.id)).updatedAt.toISOString(), savedProject.updatedAt.toISOString());
  });

  // Verifica che un errore della notifica di risoluzione annulli la chiusura.
  QUnit.test('resolution notification failure rolls back closure and project timestamp', async (assert) => {
    const issue = await createIssue(assert, memberToken, Number(member.id));
    await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'IN_PROGRESS' });
    const savedProject = await Project.findByPk(project.id);
    const original = Notification.create;
    Notification.create = async () => { throw new Error('Simulated resolution failure'); };
    try {
      await call(assert, 'PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'CLOSED' }, 500);
    } finally { Notification.create = original; }
    assert.strictEqual((await Issue.findByPk(issue.id)).status, 'IN_PROGRESS');
    assert.strictEqual(await Notification.count({ where: { issueId: issue.id } }), 0);
    assert.strictEqual((await Project.findByPk(project.id)).updatedAt.toISOString(), savedProject.updatedAt.toISOString());
  });

  // Verifica risposte JSON uniformi per richieste malformate e percorsi inesistenti.
  QUnit.test('malformed JSON and unknown endpoints return JSON errors', async (assert) => {
    const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
    assert.strictEqual(response.status, 400);
    assert.strictEqual((await response.json()).code, 'INVALID_REQUEST');
    const result = await call(assert, 'GET', '/does-not-exist', memberToken, undefined, 404);
    assert.strictEqual(result.path, '/api/does-not-exist');
  });

  // Verifica che ripetere lo script SQL conservi righe, identificatori e password esistenti.
  QUnit.test('initial SQL is repeatable and preserves rows, IDs and existing BCrypt hashes', async (assert) => {
    const issue = await createIssue(assert, adminToken, Number(member.id));
    const oldHash = (await User.findByPk(member.id)).passwordHash;
    await applySql();
    await applySql();
    assert.strictEqual((await Issue.findByPk(issue.id)).title, issue.title);
    assert.strictEqual((await User.findByPk(member.id)).passwordHash, oldHash);
  });

  // Verifica che l'amministratore iniziale venga creato una sola volta senza reimpostare password.
  QUnit.test('development admin is created once and existing credentials are not reset', async (assert) => {
    const names = ['NODE_ENV', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_FULL_NAME'];
    const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    try {
      process.env.NODE_ENV = 'development';
      process.env.ADMIN_EMAIL = `bootstrap-${randomUUID()}@example.test`;
      process.env.ADMIN_PASSWORD = 'Original123!';
      process.env.ADMIN_FULL_NAME = 'Initial administrator';
      await bootstrapAdmin();
      const first = await User.findOne({ where: { email: process.env.ADMIN_EMAIL } });
      assert.strictEqual(first.role, 'ADMIN');
      assert.ok(await bcrypt.compare('Original123!', first.passwordHash));
      process.env.ADMIN_PASSWORD = 'Different123!';
      await bootstrapAdmin();
      const second = await User.findByPk(first.id);
      assert.strictEqual(second.passwordHash, first.passwordHash);
      assert.strictEqual(await User.count({ where: { email: process.env.ADMIN_EMAIL } }), 1);
    } finally {
      for (const name of names) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    }
  });

  // Verifica la migrazione dalla prima milestone senza perdita di utenti e progetti.
  QUnit.test('explicit initializer upgrades milestone 1 without deleting existing rows', async (assert) => {
    const legacySchema = `${schema}_legacy`;
    await sequelize.getQueryInterface().createSchema(legacySchema);
    try {
      await sequelize.transaction(async (transaction) => {
        await sequelize.query("SELECT set_config('search_path', $schema, true)", { bind: { schema: legacySchema }, transaction });
        await sequelize.query(initialSql.split('-- Milestone 2:')[0], { transaction });
      });
      const legacyUser = await User.schema(legacySchema).create({ fullName: 'Existing Spring user',
        email: 'legacy@example.test', role: 'ADMIN', passwordHash: hash.replace('$2b$', '$2a$') });
      const legacyProject = await Project.schema(legacySchema).create({ name: 'Existing project', description: 'Milestone 1 data' });
      await runInitializer(assert, legacySchema);
      assert.strictEqual((await User.schema(legacySchema).findByPk(legacyUser.id)).passwordHash, legacyUser.passwordHash);
      assert.strictEqual((await Project.schema(legacySchema).findByPk(legacyProject.id)).name, 'Existing project');
      assert.strictEqual(await Issue.schema(legacySchema).count(), 0);
      assert.strictEqual(await Notification.schema(legacySchema).count(), 0);
    } finally {
      await sequelize.getQueryInterface().dropSchema(legacySchema);
    }
  });

  // Verifica la migrazione ripetibile di OPEN e della priorita senza perdita dei dati storici.
  QUnit.test('requirements migration preserves legacy data, converts only OPEN and is repeatable', async (assert) => {
    const legacySchema = `${schema}_requirements`;
    await sequelize.getQueryInterface().createSchema(legacySchema);
    try {
      await sequelize.transaction(async (transaction) => {
        await sequelize.query("SELECT set_config('search_path', $schema, true)", { bind: { schema: legacySchema }, transaction });
        await sequelize.query(initialSql, { transaction });
      });
      const user = await User.schema(legacySchema).create({ fullName: 'Legacy reporter',
        email: 'reporter@example.test', role: 'USER', passwordHash: hash });
      const legacyProject = await Project.schema(legacySchema).create({ name: 'Legacy project', description: 'Preserve me' });
      await Membership.schema(legacySchema).create({ projectId: legacyProject.id, userId: user.id });
      const rows = [];
      for (const status of ['OPEN', 'IN_PROGRESS', 'CLOSED']) {
        const [inserted] = await sequelize.query(`INSERT INTO "${legacySchema}".issues
          (project_id, reporter_id, title, description, type, priority, status, created_at, updated_at)
          VALUES ($project, $reporter, $status, 'Keep description', 'BUG', 'HIGH', $status, now(), now()) RETURNING *`,
        { bind: { project: legacyProject.id, reporter: user.id, status } });
        rows.push(inserted[0]);
      }
      await sequelize.query(`INSERT INTO "${legacySchema}".issue_comments (issue_id, author_id, content, created_at)
        VALUES ($issue, $author, 'Keep comment', now())`, { bind: { issue: rows[0].id, author: user.id } });
      await sequelize.query(`INSERT INTO "${legacySchema}".notifications (issue_id, recipient_id, message, read, created_at)
        VALUES ($issue, $recipient, 'Keep notification', true, now())`, { bind: { issue: rows[0].id, recipient: user.id } });
      await runInitializer(assert, legacySchema);
      await runInitializer(assert, legacySchema);
      const migrated = await Issue.schema(legacySchema).findAll({ order: [['id', 'ASC']] });
      assert.deepEqual(migrated.map((issue) => issue.status), ['TODO', 'IN_PROGRESS', 'CLOSED']);
      for (let i = 0; i < rows.length; i++) {
        assert.strictEqual(String(migrated[i].id), String(rows[i].id));
        assert.strictEqual(migrated[i].title, rows[i].title);
        assert.strictEqual(migrated[i].priority, 'HIGH');
        assert.strictEqual(migrated[i].updatedAt.toISOString(), rows[i].updated_at.toISOString());
      }
      assert.strictEqual((await User.schema(legacySchema).findByPk(user.id)).passwordHash, hash);
      assert.strictEqual(await Membership.schema(legacySchema).count(), 1);
      assert.strictEqual((await Comment.schema(legacySchema).findOne()).content, 'Keep comment');
      const notification = await Notification.schema(legacySchema).findOne();
      assert.strictEqual(notification.kind, 'ACTIVITY');
      assert.strictEqual(notification.read, true);
      const [created] = await sequelize.query(`INSERT INTO "${legacySchema}".issues
        (project_id, reporter_id, title, description, type, created_at, updated_at)
        VALUES ($project, $reporter, 'Without priority', 'Description', 'BUG', now(), now()) RETURNING *`,
      { bind: { project: legacyProject.id, reporter: user.id } });
      assert.strictEqual(created[0].priority, null);
      assert.strictEqual(created[0].status, 'TODO');
      await assert.rejects(sequelize.query(`UPDATE "${legacySchema}".issues SET status = 'OPEN'`));
    } finally {
      await sequelize.getQueryInterface().dropSchema(legacySchema);
    }
  });

  // Avvia un altro processo Node per verificare il vero percorso server.js e il riavvio.
  async function startChild(extraEnv = {}) {
    const child = spawn(process.execPath, ['src/server.js'], { cwd: new URL('../..', import.meta.url),
      env: { ...process.env, SERVER_PORT: '0', ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let errorOutput = '';
    child.stderr.on('data', (chunk) => { errorOutput += chunk; });
    const ready = new Promise((resolve, reject) => {
      child.stdout.on('data', (chunk) => {
        output += chunk;
        const match = /BugBoard26 API: http:\/\/localhost:(\d+)\/api/.exec(output);
        if (match) resolve(`http://127.0.0.1:${match[1]}/api`);
      });
      child.once('exit', (code) => reject(new Error(`Server exited ${code}: ${errorOutput}`)));
    });
    try {
      const url = await Promise.race([ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Server startup timeout')), 15000).unref())]);
      return { child, url };
    } catch (error) { child.kill(); throw error; }
  }

  async function stopChild(child) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }

  // Verifica la persistenza di account, issue, immagini, commenti e notifiche dopo veri riavvii.
  QUnit.test('server restarts preserve users, projects, issue, comment and read notification', async (assert) => {
    const issue = await call(assert, 'POST', '/issues', adminToken, imageUpload(png, 'image/png', payload(Number(member.id))), 201);
    const savedImage = (await IssueImage.findByPk(issue.id)).data;
    await call(assert, 'POST', `/issues/${issue.id}/comments`, memberToken, { content: 'Persistent comment' }, 201);
    const notification = (await call(assert, 'GET', '/notifications', memberToken)).items[0];
    await call(assert, 'PATCH', `/notifications/${notification.id}/read`, memberToken);
    for (let restart = 0; restart < 2; restart++) {
      const { child, url } = await startChild();
      try {
        const detail = await fetch(`${url}/issues/${issue.id}`, { headers: { Authorization: `Bearer ${memberToken}` } });
        assert.strictEqual(detail.status, 200);
        assert.strictEqual((await detail.json()).title, issue.title);
        const image = await fetch(`${url}/issues/${issue.id}/image`, { headers: { Authorization: `Bearer ${memberToken}` } });
        assert.strictEqual(image.status, 200);
        assert.true(Buffer.from(await image.arrayBuffer()).equals(savedImage), 'Byte conservati dopo riavvio');
        const feed = await fetch(`${url}/notifications`, { headers: { Authorization: `Bearer ${memberToken}` } });
        assert.strictEqual((await feed.json()).items.find((item) => item.id === notification.id).read, true);
      } finally { await stopChild(child); }
    }
    assert.strictEqual(await Comment.count({ where: { issueId: issue.id } }), 1);
  });

});
