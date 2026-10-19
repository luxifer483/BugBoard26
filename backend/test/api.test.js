// Verifica le API Express su PostgreSQL reale, usando soltanto uno schema temporaneo dedicato.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Set TEST_DATABASE_URL to a disposable PostgreSQL database, or run backend/test-docker.ps1.');
}
process.env.NODE_ENV = 'test';
process.env.DB_URL = process.env.TEST_DATABASE_URL;
process.env.TEST_DB_SCHEMA = `bugboard_test_${randomUUID().replaceAll('-', '')}`;
process.env.JWT_SECRET = 'node-test-secret-with-more-than-thirty-two-bytes';
process.env.JWT_ISSUER = 'bugboard26';
process.env.JWT_AUDIENCE = 'bugboard26-frontend';

const { default: app } = await import('../src/app.js');
const { sequelize, User, Project, Membership, Issue, Comment, Notification } = await import('../src/models/index.js');
const { createToken } = await import('../src/services/auth.js');
const { bootstrapAdmin } = await import('../src/services/bootstrap.js');
const schema = process.env.TEST_DB_SCHEMA;
const initialSql = await readFile(new URL('../sql/001-initial.sql', import.meta.url), 'utf8');
const hash = await bcrypt.hash('Password123!', 4);
let server, base;
let admin, member, reviewer, outsider, project;
let adminToken, memberToken, reviewerToken, outsiderToken;

// Installa lo stesso SQL di Spring nello schema isolato, mai nel database di sviluppo.
async function applySql(sql = initialSql) {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query("SELECT set_config('search_path', $schema, true)", { bind: { schema }, transaction });
    await sequelize.query(sql, { transaction });
  });
}

before(async () => {
  await sequelize.authenticate();
  await sequelize.getQueryInterface().createSchema(schema);
  await applySql();
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  // Rimuove solo lo schema con il nome casuale generato da questa esecuzione.
  await sequelize.getQueryInterface().dropSchema(schema);
  await sequelize.close();
});

beforeEach(async () => {
  const suffix = randomUUID();
  [admin, member, reviewer, outsider] = await Promise.all(['ADMIN', 'USER', 'USER', 'USER'].map((role, index) =>
    User.create({ fullName: `User ${index}`, email: `${index}-${suffix}@example.test`, passwordHash: hash, role })));
  [adminToken, memberToken, reviewerToken, outsiderToken] = [admin, member, reviewer, outsider].map((user) => createToken(user).token);
  project = await Project.create({ name: 'Test project', description: 'Disposable verification' });
  await Membership.bulkCreate([{ projectId: project.id, userId: member.id }, { projectId: project.id, userId: reviewer.id }]);
});

// Invia una vera richiesta HTTP senza simulare controller, autenticazione o database.
async function call(method, path, token, input, expected = 200, headers = {}) {
  const response = await fetch(base + path, { method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(input !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
  const content = await response.text();
  assert.equal(response.status, expected, `${method} ${path}: ${content}`);
  return content ? JSON.parse(content) : null;
}

function payload(assigneeId = null) {
  return { projectId: Number(project.id), title: 'Test issue', description: 'Description', type: 'BUG', priority: 'HIGH', assigneeId };
}

async function createIssue(token = adminToken, assigneeId = null) {
  return call('POST', '/issues', token, payload(assigneeId), 201);
}

test('login normalizes email and returns a signed token and safe account', async () => {
  const result = await call('POST', '/auth/login', null, { email: admin.email.toUpperCase(), password: 'Password123!' });
  assert.equal(result.user.id, Number(admin.id));
  assert.equal(result.user.role, 'ADMIN');
  assert.equal(result.user.passwordHash, undefined);
  assert.equal(result.user.password, undefined);
  assert.ok(Date.parse(result.expiresAt) > Date.now());
  assert.equal((await call('GET', '/users/me', result.token)).id, Number(admin.id));
});

test('wrong password and unknown email return the same failure', async () => {
  for (const email of [admin.email, 'missing@example.test']) {
    const error = await call('POST', '/auth/login', null, { email, password: 'wrong' }, 401);
    assert.equal(error.code, 'INVALID_CREDENTIALS');
  }
});

test('login rejects a multibyte password beyond the BCrypt byte limit', async () => {
  const error = await call('POST', '/auth/login', null, { email: admin.email, password: 'é'.repeat(40) }, 401);
  assert.equal(error.code, 'INVALID_CREDENTIALS');
});

test('existing BCrypt 2a hashes and Spring-shaped HS256 tokens remain usable', async () => {
  await member.update({ passwordHash: hash.replace('$2b$', '$2a$') });
  const session = await call('POST', '/auth/login', null, { email: member.email, password: 'Password123!' });
  assert.equal(session.user.id, Number(member.id));
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const issued = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: 'HS256' })}.${encode({ sub: String(member.id), iss: 'bugboard26',
    aud: ['bugboard26-frontend'], iat: issued, exp: issued + 3600 })}`;
  const legacy = `${unsigned}.${createHmac('sha256', process.env.JWT_SECRET).update(unsigned).digest('base64url')}`;
  assert.equal((await call('GET', '/users/me', legacy)).id, Number(member.id));
});

test('missing, altered, expired and wrongly signed tokens are rejected', async () => {
  for (const token of [undefined, `${adminToken}invalid`, jwt.sign({ sub: String(admin.id) }, 'wrong-key')]) {
    assert.equal((await call('GET', '/projects', token, undefined, 401)).code, 'UNAUTHORIZED');
  }
  for (const overrides of [{ expiresIn: -3600 }, { issuer: 'other' }, { audience: 'other' }]) {
    const token = jwt.sign({}, process.env.JWT_SECRET, { algorithm: 'HS256', subject: String(admin.id),
      issuer: 'bugboard26', audience: 'bugboard26-frontend', expiresIn: 3600, ...overrides });
    await call('GET', '/users/me', token, undefined, 401);
  }
});

test('current user and privileges are reloaded from the database on each request', async () => {
  await call('GET', '/users', memberToken, undefined, 403);
  await member.update({ role: 'ADMIN' });
  await call('GET', '/users', memberToken);
  await member.update({ role: 'USER' });
  await call('GET', '/users', memberToken, undefined, 403);
});

test('admin creates users with hashed passwords and unique normalized email', async () => {
  const input = { fullName: 'New user', email: `NEW-${randomUUID()}@example.test`, password: 'Password123!', role: 'USER' };
  const result = await call('POST', '/users', adminToken, input, 201);
  assert.equal(result.email, input.email.toLowerCase());
  const saved = await User.findByPk(result.id);
  assert.notEqual(saved.passwordHash, input.password);
  assert.ok(await bcrypt.compare(input.password, saved.passwordHash));
  assert.equal((await call('POST', '/users', adminToken, input, 409)).code, 'EMAIL_EXISTS');
});

test('normal users cannot enumerate accounts or create users or projects', async () => {
  await call('GET', '/users', memberToken, undefined, 403);
  await call('POST', '/users', memberToken, { fullName: 'Escalation', email: 'x@example.test', password: 'Password123!', role: 'ADMIN' }, 403);
  await call('POST', '/projects', memberToken, { name: 'Forbidden', description: 'Description' }, 403);
});

test('user validation rejects blank names, invalid email, roles and BCrypt truncation', async () => {
  const valid = { fullName: 'User', email: `${randomUUID()}@example.test`, password: 'Password123!', role: 'USER' };
  for (const invalid of [{ fullName: ' ' }, { email: 'invalid' }, { password: 'short' },
    { password: 'é'.repeat(40) }, { role: 'QA' }]) {
    const error = await call('POST', '/users', adminToken, { ...valid, ...invalid }, 400);
    assert.ok(error.code);
    assert.equal(error.path, '/api/users');
  }
});

test('project creation also creates the administrator membership', async () => {
  const created = await call('POST', '/projects', adminToken, { name: ' New project ', description: ' Description ' }, 201);
  assert.equal(created.name, 'New project');
  assert.equal(created.memberCount, 1);
  assert.equal(created.totalIssues, 0);
  const members = await call('GET', `/projects/${created.id}/members`, adminToken);
  assert.equal(members.items[0].userId, Number(admin.id));
});

test('project lists and direct access enforce membership; admin access is global', async () => {
  const other = await Project.create({ name: 'Private project', description: 'Description' });
  const visible = await call('GET', '/projects', memberToken);
  assert.deepEqual(visible.items.map((item) => item.id), [Number(project.id)]);
  await call('GET', `/projects/${other.id}`, memberToken, undefined, 403);
  await call('GET', `/projects/${other.id}/members`, memberToken, undefined, 403);
  await call('GET', `/projects/${other.id}`, adminToken);
});

test('membership creation, duplicate detection and immediate revocation work', async () => {
  await call('POST', `/projects/${project.id}/members`, memberToken, { userId: Number(outsider.id) }, 403);
  await call('POST', `/projects/${project.id}/members`, adminToken, { userId: Number(outsider.id) }, 201);
  assert.equal((await call('POST', `/projects/${project.id}/members`, adminToken, { userId: Number(outsider.id) }, 409)).code, 'ALREADY_MEMBER');
  await call('GET', `/projects/${project.id}`, outsiderToken);
  await call('DELETE', `/projects/${project.id}/members/${outsider.id}`, memberToken, undefined, 403);
  await call('DELETE', `/projects/${project.id}/members/${outsider.id}`, adminToken, undefined, 204);
  await call('GET', `/projects/${project.id}`, outsiderToken, undefined, 403);
});

test('malformed and out-of-range identifiers are handled without SQL errors', async () => {
  for (const value of ['not-a-number', '0', '-1', '1.5', '9223372036854775808']) {
    await call('GET', `/projects/${value}`, adminToken, undefined, 400);
  }
  await call('GET', '/projects/9223372036854775807', adminToken, undefined, 404);
  await call('GET', '/issues/9223372036854775807', memberToken, undefined, 404);
});

test('CORS allows the frontend and PATCH, and rejects an unrelated origin', async () => {
  const allowed = await fetch(`${base}/issues/1/status`, { method: 'OPTIONS', headers: {
    Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'PATCH',
    'Access-Control-Request-Headers': 'authorization,content-type',
  } });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.match(allowed.headers.get('access-control-allow-methods'), /PATCH/);
  await call('OPTIONS', '/projects', null, undefined, 403, { Origin: 'https://untrusted.example',
    'Access-Control-Request-Method': 'GET' });
});

test('member creates an issue while reporter, status and dates remain server controlled', async () => {
  const issue = await call('POST', '/issues', memberToken, { ...payload(Number(member.id)),
    reporter: { id: Number(admin.id) }, status: 'CLOSED', createdAt: '2000-01-01T00:00:00Z' }, 201);
  assert.equal(issue.reporter.id, Number(member.id));
  assert.equal(issue.status, 'OPEN');
  assert.equal(issue.code, `BUG-26-${issue.id}`);
  assert.ok(!issue.createdAt.startsWith('2000'));
  assert.equal((await call('GET', '/notifications', memberToken)).unreadCount, 0);
});

test('all four issue types remain supported', async () => {
  for (const type of ['BUG', 'QUESTION', 'DOCUMENTATION', 'FEATURE']) {
    const issue = await call('POST', '/issues', memberToken, { ...payload(), type }, 201);
    assert.equal(issue.type, type);
  }
});

test('invalid issue fields are rejected without writing rows', async () => {
  const before = await Issue.count();
  for (const invalid of [{ title: ' ' }, { description: 'x'.repeat(10001) }, { type: 'UNKNOWN' },
    { priority: null }, { priority: 'UNKNOWN' }, { projectId: -1 }, { assigneeId: true }]) {
    await call('POST', '/issues', memberToken, { ...payload(), ...invalid }, 400);
  }
  assert.equal(await Issue.count(), before);
});

test('assignee must belong to the project, including administrator accounts', async () => {
  for (const user of [outsider, admin]) {
    const error = await call('POST', '/issues', memberToken, payload(Number(user.id)), 400);
    assert.equal(error.code, 'ASSIGNEE_NOT_MEMBER');
  }
  await call('POST', '/issues', memberToken, payload(9223372036854775807n.toString()), 404);
});

test('outsiders cannot read or change issues and comments', async () => {
  const issue = await createIssue();
  for (const path of [`/projects/${project.id}/issues`, `/issues/${issue.id}`, `/issues/${issue.id}/comments`]) {
    await call('GET', path, outsiderToken, undefined, 403);
  }
  await call('POST', '/issues', outsiderToken, payload(), 403);
  await call('POST', `/issues/${issue.id}/comments`, outsiderToken, { content: 'intrusion' }, 403);
  await call('PATCH', `/issues/${issue.id}/status`, outsiderToken, { status: 'IN_PROGRESS' }, 403);
  await call('PATCH', `/issues/${issue.id}/assignee`, outsiderToken, { assigneeId: Number(member.id) }, 403);
  assert.equal((await call('GET', '/issues', outsiderToken)).totalCount, 0);
  assert.equal((await call('GET', '/issues', memberToken)).totalCount, 1);
});

test('status transitions and repeated requests preserve the current behavior', async () => {
  const issue = await createIssue(adminToken, Number(member.id));
  assert.equal((await call('PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'CLOSED' }, 409)).code, 'INVALID_STATUS_TRANSITION');
  for (const status of ['IN_PROGRESS', 'IN_PROGRESS', 'CLOSED', 'CLOSED']) {
    assert.equal((await call('PATCH', `/issues/${issue.id}/status`, memberToken, { status })).status, status);
  }
  await call('PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'OPEN' }, 409);
  assert.equal((await call('GET', '/notifications', adminToken)).unreadCount, 2);
  assert.equal((await call('GET', '/notifications', memberToken)).unreadCount, 1);
});

test('reassignment and unassignment are saved without duplicate notifications', async () => {
  const issue = await createIssue();
  for (let i = 0; i < 2; i++) {
    const result = await call('PATCH', `/issues/${issue.id}/assignee`, memberToken, { assigneeId: Number(reviewer.id) });
    assert.equal(result.assignee.id, Number(reviewer.id));
  }
  assert.equal((await call('GET', '/notifications', reviewerToken)).unreadCount, 1);
  await call('PATCH', `/issues/${issue.id}/assignee`, memberToken, { assigneeId: Number(outsider.id) }, 400);
  assert.equal((await call('PATCH', `/issues/${issue.id}/assignee`, memberToken, { assigneeId: null })).assignee, null);
  assert.equal((await call('GET', `/issues/${issue.id}`, adminToken)).assignee, null);
});

test('comments use the authenticated author, are ordered and validate content', async () => {
  const issue = await createIssue(adminToken, Number(member.id));
  const first = await call('POST', `/issues/${issue.id}/comments`, reviewerToken,
    { content: ' First comment ', author: { id: Number(admin.id) } }, 201);
  assert.equal(first.author.id, Number(reviewer.id));
  assert.equal(first.content, 'First comment');
  await call('POST', `/issues/${issue.id}/comments`, memberToken, { content: 'Second comment' }, 201);
  for (const content of [' ', 'x'.repeat(5001), null]) {
    await call('POST', `/issues/${issue.id}/comments`, memberToken, { content }, 400);
  }
  const comments = await call('GET', `/issues/${issue.id}/comments`, memberToken);
  assert.deepEqual(comments.items.map((comment) => comment.content), ['First comment', 'Second comment']);
  assert.equal((await call('GET', '/notifications', adminToken)).unreadCount, 2);
  assert.equal((await call('GET', '/notifications', memberToken)).unreadCount, 2);
});

test('notifications deduplicate reporter/assignee and exclude the actor', async () => {
  const issue = await createIssue(memberToken, Number(member.id));
  await call('POST', `/issues/${issue.id}/comments`, reviewerToken, { content: 'Please review' }, 201);
  assert.equal((await call('GET', '/notifications', memberToken)).totalCount, 1);
  assert.equal((await call('GET', '/notifications', reviewerToken)).totalCount, 0);
});

test('notifications remain private and marking read is idempotent', async () => {
  await createIssue(adminToken, Number(member.id));
  const feed = await call('GET', '/notifications', memberToken);
  const id = feed.items[0].id;
  await call('PATCH', `/notifications/${id}/read`, adminToken, undefined, 404);
  await call('PATCH', `/notifications/${id}/read`, outsiderToken, undefined, 404);
  for (let i = 0; i < 2; i++) assert.equal((await call('PATCH', `/notifications/${id}/read`, memberToken)).read, true);
  assert.equal((await call('GET', '/notifications', memberToken)).unreadCount, 0);
});

test('membership removal revokes issue/comment access and hides notifications immediately', async () => {
  const issue = await createIssue(adminToken, Number(member.id));
  const notification = (await call('GET', '/notifications', memberToken)).items[0];
  await call('DELETE', `/projects/${project.id}/members/${member.id}`, adminToken, undefined, 204);
  await call('GET', `/issues/${issue.id}`, memberToken, undefined, 403);
  await call('POST', `/issues/${issue.id}/comments`, memberToken, { content: 'revoked' }, 403);
  await call('PATCH', `/issues/${issue.id}/status`, memberToken, { status: 'IN_PROGRESS' }, 403);
  await call('PATCH', `/notifications/${notification.id}/read`, memberToken, undefined, 403);
  assert.equal((await call('GET', '/issues', memberToken)).totalCount, 0);
  assert.equal((await call('GET', '/notifications', memberToken)).totalCount, 0);
  await call('POST', `/issues/${issue.id}/comments`, reviewerToken, { content: 'after revocation' }, 201);
  assert.equal((await call('GET', '/notifications', memberToken)).totalCount, 0);
});

test('project statistics reflect persistent issue states', async () => {
  const issue = await createIssue();
  await createIssue(memberToken);
  let result = await call('GET', `/projects/${project.id}`, memberToken);
  assert.equal(result.totalIssues, 2); assert.equal(result.openIssues, 2);
  for (const status of ['IN_PROGRESS', 'CLOSED']) await call('PATCH', `/issues/${issue.id}/status`, memberToken, { status });
  result = await call('GET', `/projects/${project.id}`, memberToken);
  assert.equal(result.totalIssues, 2); assert.equal(result.openIssues, 1); assert.equal(result.closedIssues, 1);
});

test('concurrent identical status updates emit only one event', async () => {
  const issue = await createIssue(adminToken, Number(member.id));
  await Promise.all([1, 2].map(() => call('PATCH', `/issues/${issue.id}/status`, reviewerToken, { status: 'IN_PROGRESS' })));
  assert.equal((await call('GET', '/notifications', memberToken)).totalCount, 2);
  assert.equal((await call('GET', '/notifications', adminToken)).totalCount, 1);
});

test('a notification write failure rolls back issue state and project timestamp', async () => {
  const issue = await createIssue(adminToken, Number(member.id));
  const savedProject = await Project.findByPk(project.id);
  const original = Notification.create;
  Notification.create = async () => { throw new Error('Simulated notification failure'); };
  try {
    await call('PATCH', `/issues/${issue.id}/status`, reviewerToken, { status: 'IN_PROGRESS' }, 500);
  } finally { Notification.create = original; }
  assert.equal((await Issue.findByPk(issue.id)).status, 'OPEN');
  assert.equal((await Project.findByPk(project.id)).updatedAt.toISOString(), savedProject.updatedAt.toISOString());
});

test('malformed JSON and unknown endpoints return JSON errors', async () => {
  const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'INVALID_REQUEST');
  const result = await call('GET', '/does-not-exist', memberToken, undefined, 404);
  assert.equal(result.path, '/api/does-not-exist');
});

test('initial SQL is repeatable and preserves rows, IDs and existing BCrypt hashes', async () => {
  const issue = await createIssue(adminToken, Number(member.id));
  const oldHash = (await User.findByPk(member.id)).passwordHash;
  await applySql();
  await applySql();
  assert.equal((await Issue.findByPk(issue.id)).title, issue.title);
  assert.equal((await User.findByPk(member.id)).passwordHash, oldHash);
});

test('development admin is created once and existing credentials are not reset', async () => {
  const names = ['NODE_ENV', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_FULL_NAME'];
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.NODE_ENV = 'development';
    process.env.ADMIN_EMAIL = `bootstrap-${randomUUID()}@example.test`;
    process.env.ADMIN_PASSWORD = 'Original123!';
    process.env.ADMIN_FULL_NAME = 'Initial administrator';
    await bootstrapAdmin();
    const first = await User.findOne({ where: { email: process.env.ADMIN_EMAIL } });
    assert.equal(first.role, 'ADMIN');
    assert.ok(await bcrypt.compare('Original123!', first.passwordHash));
    process.env.ADMIN_PASSWORD = 'Different123!';
    await bootstrapAdmin();
    const second = await User.findByPk(first.id);
    assert.equal(second.passwordHash, first.passwordHash);
    assert.equal(await User.count({ where: { email: process.env.ADMIN_EMAIL } }), 1);
  } finally {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
});

test('explicit initializer upgrades milestone 1 without deleting existing rows', async () => {
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
    const child = spawn(process.execPath, ['scripts/init-db.js'], { cwd: new URL('..', import.meta.url),
      env: { ...process.env, TEST_DB_SCHEMA: legacySchema }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stderr.on('data', (chunk) => { output += chunk; });
    const [code] = await once(child, 'exit');
    assert.equal(code, 0, output);
    assert.equal((await User.schema(legacySchema).findByPk(legacyUser.id)).passwordHash, legacyUser.passwordHash);
    assert.equal((await Project.schema(legacySchema).findByPk(legacyProject.id)).name, 'Existing project');
    assert.equal(await Issue.schema(legacySchema).count(), 0);
    assert.equal(await Notification.schema(legacySchema).count(), 0);
  } finally {
    await sequelize.getQueryInterface().dropSchema(legacySchema);
  }
});

// Avvia un altro processo Node per verificare il vero percorso server.js e il riavvio.
async function startChild(extraEnv = {}) {
  const child = spawn(process.execPath, ['src/server.js'], { cwd: new URL('..', import.meta.url),
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

test('server restarts preserve users, projects, issue, comment and read notification', async () => {
  const issue = await createIssue(adminToken, Number(member.id));
  await call('POST', `/issues/${issue.id}/comments`, memberToken, { content: 'Persistent comment' }, 201);
  const notification = (await call('GET', '/notifications', memberToken)).items[0];
  await call('PATCH', `/notifications/${notification.id}/read`, memberToken);
  for (let restart = 0; restart < 2; restart++) {
    const { child, url } = await startChild();
    try {
      const detail = await fetch(`${url}/issues/${issue.id}`, { headers: { Authorization: `Bearer ${memberToken}` } });
      assert.equal(detail.status, 200);
      assert.equal((await detail.json()).title, issue.title);
      const feed = await fetch(`${url}/notifications`, { headers: { Authorization: `Bearer ${memberToken}` } });
      assert.equal((await feed.json()).items.find((item) => item.id === notification.id).read, true);
    } finally { await stopChild(child); }
  }
  assert.equal(await Comment.count({ where: { issueId: issue.id } }), 1);
});
