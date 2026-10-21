// Avvia una copia dimostrativa dell'app con dati separati in uno schema PostgreSQL temporaneo.
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const express = require('express');
const sharp = require('sharp');
process.env.NODE_ENV = 'test';
process.env.TEST_DB_SCHEMA = `bugboard_docs_${randomUUID().replaceAll('-', '')}`;
process.env.CORS_ALLOWED_ORIGINS = 'http://127.0.0.1:8082,http://localhost:8082';
const { sequelize, User, Project, Membership, Issue, IssueImage, Comment, Notification } = await import('../../backend/src/models/index.js');
const { initializeSchema } = await import('../../backend/src/services/schema.js');
const { hashPassword } = await import('../../backend/src/services/auth.js');
const { default: api } = await import('../../backend/src/app.js');
await sequelize.getQueryInterface().createSchema(process.env.TEST_DB_SCHEMA);
await initializeSchema();
const passwordHash = await hashPassword('DemoPassword123!');
const users = await Promise.all([
  { fullName: 'Amministratore Demo', email: 'admin@example.test', role: 'ADMIN' },
  { fullName: 'Anna Rossi', email: 'anna@example.test', role: 'USER' },
  { fullName: 'Marco Bianchi', email: 'marco@example.test', role: 'USER' },
].map((user) => User.create({ ...user, passwordHash })));
const projects = await Promise.all([
  { name: 'BugBoard26', description: 'Gestione collaborativa delle issue del progetto universitario' },
  { name: 'Portale studenti', description: 'Segnalazioni e richieste del portale dimostrativo' },
].map((project) => Project.create(project)));
for (const project of projects) {
  await Membership.bulkCreate(users.map((user) => ({ projectId: project.id, userId: user.id })));
}
const items = [
  { title: 'Il login non mostra il messaggio di errore', description: 'Inserendo una password errata, il modulo deve mantenere i dati e indicare che le credenziali non sono valide.\nPassi: aprire Login, inserire email e password errata, premere Sign In.', type: 'BUG', priority: 'HIGH', status: 'IN_PROGRESS' },
  { title: 'Chiarire il significato della priorità', description: 'Quale priorità va usata per un problema che non blocca il lavoro?', type: 'QUESTION', priority: null, status: 'TODO' },
  { title: 'Aggiornare le istruzioni di avvio', description: 'Aggiungere il comando esplicito per inizializzare lo schema PostgreSQL.', type: 'DOCUMENTATION', priority: 'LOW', status: 'CLOSED' },
  { title: 'Mostrare una immagine nella segnalazione', description: 'Permettere di allegare una schermata al momento della creazione della issue.', type: 'FEATURE', priority: 'MEDIUM', status: 'TODO' },
];
const issues = [];
for (const item of items) {
  issues.push(await Issue.create({ ...item, projectId: projects[0].id, reporterId: users[1].id, assigneeId: users[0].id }));
}
const attachment = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="260"><rect width="900" height="260" fill="#f8fafc"/><rect x="40" y="40" width="820" height="180" rx="12" fill="white" stroke="#d9e1ec"/><text x="70" y="90" font-size="25" font-family="sans-serif" fill="#18263b">Accesso a BugBoard26</text><text x="70" y="140" font-size="19" font-family="sans-serif" fill="#46536b">Password non valida</text><rect x="70" y="165" width="740" height="32" rx="5" fill="#fff1f2"/><text x="85" y="188" font-size="17" font-family="sans-serif" fill="#b91c1c">Invalid email or password.</text></svg>')).png().toBuffer();
await IssueImage.create({ issueId: issues[0].id, contentType: 'image/png', data: attachment });
await Comment.bulkCreate([
  { issueId: issues[0].id, authorId: users[1].id, content: 'Il problema si presenta dopo un tentativo di accesso con password errata.' },
  { issueId: issues[0].id, authorId: users[0].id, content: 'Segnalazione presa in carico. Sto verificando il messaggio restituito dalle API.' },
]);
await Notification.bulkCreate([
  { issueId: issues[0].id, recipientId: users[0].id, message: `Issue BUG-26-${issues[0].id} has been assigned to you`, kind: 'ACTIVITY' },
  { issueId: issues[2].id, recipientId: users[1].id, message: `Issue BUG-26-${issues[2].id} has been resolved`, kind: 'RESOLUTION' },
]);
await mkdir(path.join(root, 'tmp/documentazione/screens'), { recursive: true });
await writeFile(path.join(root, 'tmp/documentazione/demo-info.json'), JSON.stringify({ projectId: Number(projects[0].id), issueId: Number(issues[0].id), schema: process.env.TEST_DB_SCHEMA }, null, 2));
await writeFile(path.join(root, 'tmp/documentazione/screens/allegato-demo.png'), attachment);
const web = express();
web.use(express.static(path.join(root, 'tmp/documentazione/site')));
web.use((req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(root, 'tmp/documentazione/site/index.html')));
web.use(api);
const server = web.listen(8082, '127.0.0.1', () => console.log('Documentation demo ready: http://127.0.0.1:8082'));
// Chiude la copia dimostrativa ed elimina soltanto lo schema casuale creato da questo script.
async function stop() {
  server.close(async () => {
    await sequelize.getQueryInterface().dropSchema(process.env.TEST_DB_SCHEMA);
    await sequelize.close();
    process.exit(0);
  });
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
